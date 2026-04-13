"""
POST /api/extract — 선택한 포맷의 CDN 직접 다운로드 URL 추출
Vercel Python serverless function

요청: { "url": "https://...", "format_id": "137+140", "audio_only": false }
응답: { download_url, filename, ext, expires_in }
"""

import ipaddress
import json
import re
import socket
import subprocess
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse


# yt-dlp 프로세스 타임아웃 (초) — Vercel 10초 타임아웃보다 여유있게 설정
YTDLP_TIMEOUT = 8

# 에러 코드
ERROR_INVALID_REQUEST = "INVALID_REQUEST"
ERROR_EXTRACTION_FAILED = "EXTRACTION_FAILED"
ERROR_TIMEOUT = "TIMEOUT"
ERROR_EXTRACTION = "EXTRACTION_ERROR"

# format_id allowlist: 숫자, 영문자, +, -, . 만 허용 (최대 64자)
FORMAT_ID_RE = re.compile(r'^[\w+\-\.]{1,64}$')


def is_ssrf_safe(url: str) -> bool:
    """
    SSRF 방어: 내부 네트워크/루프백/메타데이터 IP로의 요청 차단
    """
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname
        if not hostname:
            return False
        # DNS 해석
        ip_str = socket.gethostbyname(hostname)
        ip = ipaddress.ip_address(ip_str)
        # 사설/루프백/링크로컬/예약 주소 차단
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            return False
        # AWS 메타데이터 엔드포인트 명시 차단
        if ip_str.startswith("169.254."):
            return False
    except Exception:
        return False
    return True

# 한국어 오류 메시지
ERROR_MESSAGES = {
    ERROR_INVALID_REQUEST: "url과 format_id를 모두 입력해주세요.",
    ERROR_EXTRACTION_FAILED: "영상이 비공개이거나 지역 제한으로 다운로드할 수 없습니다.",
    ERROR_TIMEOUT: "요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.",
    ERROR_EXTRACTION: "다운로드 URL 추출에 실패했습니다.",
}

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}

# CDN URL 만료 시간 추정 (플랫폼별 기본값, 초 단위)
# yt-dlp는 만료 시간을 직접 노출하지 않으므로 플랫폼별 경험치 사용
PLATFORM_EXPIRES: dict[str, int] = {
    "youtube": 21600,       # 6시간 (googlevideo.com 기본)
    "youtu.be": 21600,
    "tiktok": 3600,         # 1시간
    "instagram": 3600,
    "twitter": 86400,       # 24시간
    "x.com": 86400,
    "reddit": 3600,
    "facebook": 3600,
    "vimeo": None,          # Vimeo는 만료 없음
    "twitch": 3600,
}

# expires 쿼리 파라미터 패턴 (YouTube 등)
RE_EXPIRE = re.compile(r"[?&]expire(?:s)?=(\d+)", re.IGNORECASE)


def sanitize_filename(title: str) -> str:
    """
    파일명에 사용할 수 없는 문자 제거/교체
    한글, 영문, 숫자, 공백(→ _), 하이픈, 점 허용
    """
    # 공백을 언더스코어로 교체
    name = title.replace(" ", "_")
    # 허용 문자 외 제거 (한글 포함)
    name = re.sub(r"[^\w\-.]", "", name, flags=re.UNICODE)
    # 연속 언더스코어 정리
    name = re.sub(r"_+", "_", name)
    # 최대 100자 제한
    return name[:100].strip("_")


def guess_expires_in(cdn_url: str, platform_url: str) -> int | None:
    """
    CDN URL 또는 플랫폼 URL에서 만료 시간 추정 (초)

    1. CDN URL의 expire 쿼리 파라미터 파싱 시도
    2. 없으면 플랫폼별 기본값 반환
    """
    import time

    # CDN URL의 expire 파라미터 파싱
    match = RE_EXPIRE.search(cdn_url)
    if match:
        expire_ts = int(match.group(1))
        now_ts = int(time.time())
        remaining = expire_ts - now_ts
        return max(remaining, 0) if remaining > 0 else 0

    # 플랫폼별 기본값
    platform_lower = platform_url.lower()
    for platform_key, expires in PLATFORM_EXPIRES.items():
        if platform_key in platform_lower:
            return expires

    # 기본값: 1시간
    return 3600


def infer_ext_from_format_id(format_id: str, audio_only: bool) -> str:
    """format_id 또는 audio_only 플래그로 파일 확장자 추론"""
    if audio_only:
        return "m4a"
    # format_id에 "+" 포함 시 mp4 (비디오+오디오 병합)
    if "+" in format_id:
        return "mp4"
    return "mp4"


def extract_cdn_url(url: str, format_id: str, audio_only: bool) -> dict:
    """
    yt-dlp --get-url 실행하여 CDN 직접 다운로드 URL 추출

    Returns:
        성공 시 ExtractResult dict, 실패 시 {"error": ..., "message": ...}
    """
    if audio_only:
        fmt_selector = "bestaudio"
    else:
        fmt_selector = format_id

    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--get-url",
        "--no-warnings",
        "--quiet",
        "--no-playlist",
        "-f", fmt_selector,
        url,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=YTDLP_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        return {
            "error": ERROR_TIMEOUT,
            "message": ERROR_MESSAGES[ERROR_TIMEOUT],
        }
    except FileNotFoundError:
        return {
            "error": ERROR_EXTRACTION,
            "message": ERROR_MESSAGES[ERROR_EXTRACTION],
        }

    if result.returncode != 0 or not result.stdout.strip():
        stderr_lower = (result.stderr or "").lower()
        # 비공개/지역 제한 감지
        if any(k in stderr_lower for k in ("private", "login", "geo", "not available", "members only")):
            return {
                "error": ERROR_EXTRACTION_FAILED,
                "message": ERROR_MESSAGES[ERROR_EXTRACTION_FAILED],
            }
        return {
            "error": ERROR_EXTRACTION,
            "message": ERROR_MESSAGES[ERROR_EXTRACTION],
        }

    # --get-url은 여러 URL을 줄 단위로 반환할 수 있음 (비디오+오디오 스트림)
    # 첫 번째 URL을 메인 다운로드 URL로 사용
    cdn_urls = [line.strip() for line in result.stdout.strip().splitlines() if line.strip()]
    if not cdn_urls:
        return {
            "error": ERROR_EXTRACTION,
            "message": ERROR_MESSAGES[ERROR_EXTRACTION],
        }

    # 비디오+오디오 병합 포맷(format_id에 "+" 포함)의 경우
    # yt-dlp --get-url은 두 줄(비디오 URL, 오디오 URL)을 반환
    # 이 경우 클라이언트에서 직접 병합 다운로드가 불가능하므로
    # 비디오 스트림 URL만 반환하고 filename에 품질 정보 포함
    primary_url = cdn_urls[0]

    # 파일명은 폴백 방식으로 생성 (이중 yt-dlp 호출 제거 — 타임아웃 위험)
    ext = infer_ext_from_format_id(format_id, audio_only)
    if audio_only:
        ext = "m4a"
    filename = f"reclip_{format_id.replace('+', '_')}.{ext}" if not audio_only else f"reclip_audio.{ext}"
    if audio_only:
        ext = "m4a"

    expires_in = guess_expires_in(primary_url, url)

    return {
        "download_url": primary_url,
        "filename": filename,
        "ext": ext,
        "expires_in": expires_in,
    }


def build_filename(url: str, format_id: str, audio_only: bool) -> str:
    """
    yt-dlp --get-filename으로 권장 파일명 생성
    실패 시 기본 파일명 반환
    """
    if audio_only:
        template = "%(title)s.%(ext)s"
        fmt_selector = "bestaudio"
    else:
        template = "%(title)s_%(height)sp.%(ext)s"
        fmt_selector = format_id

    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--get-filename",
        "--no-warnings",
        "--quiet",
        "--no-playlist",
        "-f", fmt_selector,
        "-o", template,
        url,
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=5,  # 파일명 조회는 짧은 타임아웃
        )
        if result.returncode == 0 and result.stdout.strip():
            raw_name = result.stdout.strip()
            # 파일명 정제 (경로 구분자 제거 등)
            raw_name = raw_name.replace("/", "_").replace("\\", "_")
            return raw_name
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass

    # 폴백 파일명
    if audio_only:
        return "audio.m4a"
    return f"video_{format_id.replace('+', '_')}.mp4"


def validate_request(body: dict) -> str | None:
    """
    요청 유효성 검사

    Returns:
        오류 메시지 문자열(실패) 또는 None(성공)
    """
    url = body.get("url", "")
    audio_only = bool(body.get("audio_only", False))
    format_id = body.get("format_id", "")

    if not url or not isinstance(url, str) or not url.strip():
        return "url 필드가 필요합니다."

    url = url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        return "유효한 URL을 입력해주세요."

    if len(url) > 2048:
        return "URL이 너무 깁니다."

    # SSRF 방어: 내부 IP 차단
    if not is_ssrf_safe(url):
        return "허용되지 않는 URL입니다."

    if not audio_only:
        if not format_id or not isinstance(format_id, str) or not format_id.strip():
            return "format_id 필드가 필요합니다. (audio_only=true가 아닌 경우)"
        # format_id 인젝션 방어: allowlist 정규식 검증
        if not FORMAT_ID_RE.match(format_id.strip()):
            return "format_id 형식이 올바르지 않습니다."

    return None


class handler(BaseHTTPRequestHandler):
    """Vercel Python serverless handler"""

    def send_json(self, status: int, data: dict) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        """CORS preflight 처리"""
        self.send_response(204)
        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)
        self.end_headers()

    def do_POST(self) -> None:
        # 요청 본문 읽기
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self.send_json(400, {
                "error": ERROR_INVALID_REQUEST,
                "message": "요청 본문이 비어 있습니다.",
            })
            return

        raw_body = self.rfile.read(content_length)
        try:
            body = json.loads(raw_body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {
                "error": ERROR_INVALID_REQUEST,
                "message": "유효한 JSON 형식으로 요청해주세요.",
            })
            return

        validation_error = validate_request(body)
        if validation_error:
            self.send_json(400, {
                "error": ERROR_INVALID_REQUEST,
                "message": validation_error,
            })
            return

        url = body["url"].strip()
        format_id = body.get("format_id", "").strip()
        audio_only = bool(body.get("audio_only", False))

        result = extract_cdn_url(url, format_id, audio_only)

        if "error" in result:
            error_code = result["error"]
            if error_code == ERROR_TIMEOUT:
                self.send_json(504, result)
            elif error_code == ERROR_EXTRACTION_FAILED:
                self.send_json(422, result)
            else:
                self.send_json(500, result)
            return

        self.send_json(200, result)
