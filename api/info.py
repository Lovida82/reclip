"""
POST /api/info — 영상 메타데이터 + 포맷 목록 추출
Vercel Python serverless function

요청: { "url": "https://..." }
응답: { id, title, thumbnail, duration, uploader, platform, formats, audio_formats }
"""

import json
import subprocess
import sys
from http.server import BaseHTTPRequestHandler


# yt-dlp 프로세스 타임아웃 (초) — Vercel 10초 타임아웃보다 여유있게 설정
YTDLP_TIMEOUT = 8

# 에러 코드
ERROR_INVALID_URL = "INVALID_URL"
ERROR_UNSUPPORTED_URL = "UNSUPPORTED_URL"
ERROR_PRIVATE_VIDEO = "PRIVATE_VIDEO"
ERROR_GEO_BLOCKED = "GEO_BLOCKED"
ERROR_TIMEOUT = "TIMEOUT"
ERROR_EXTRACTION = "EXTRACTION_ERROR"

# 한국어 오류 메시지
ERROR_MESSAGES = {
    ERROR_INVALID_URL: "유효한 URL을 입력해주세요.",
    ERROR_UNSUPPORTED_URL: "지원하지 않는 플랫폼입니다.",
    ERROR_PRIVATE_VIDEO: "비공개 영상으로 접근할 수 없습니다.",
    ERROR_GEO_BLOCKED: "현재 서버 위치에서 접근할 수 없는 영상입니다.",
    ERROR_TIMEOUT: "요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.",
    ERROR_EXTRACTION: "영상 정보를 가져오는 데 실패했습니다.",
}

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}


def classify_ytdlp_error(stderr: str) -> str:
    """yt-dlp stderr 출력에서 에러 코드 분류"""
    stderr_lower = stderr.lower()
    if "unsupported url" in stderr_lower or "no suitable" in stderr_lower:
        return ERROR_UNSUPPORTED_URL
    if "private video" in stderr_lower or "login required" in stderr_lower:
        return ERROR_PRIVATE_VIDEO
    if "geo" in stderr_lower or "not available in your country" in stderr_lower:
        return ERROR_GEO_BLOCKED
    return ERROR_EXTRACTION


def sanitize_resolution(height: int | None, width: int | None) -> str:
    """픽셀 높이로 해상도 레이블 반환"""
    if height is None:
        return "unknown"
    if height >= 2160:
        return "4K"
    if height >= 1440:
        return "1440p"
    if height >= 1080:
        return "1080p"
    if height >= 720:
        return "720p"
    if height >= 480:
        return "480p"
    if height >= 360:
        return "360p"
    if height >= 240:
        return "240p"
    return f"{height}p"


def extract_formats(raw_formats: list) -> tuple[list, list]:
    """
    yt-dlp dump-json의 formats 배열에서
    비디오 포맷과 오디오 전용 포맷을 분리하여 반환

    Returns:
        (video_formats, audio_formats) — 각각 해상도/비트레이트 내림차순 정렬
    """
    video_formats = []
    audio_formats = []

    seen_resolutions: set[str] = set()

    for fmt in raw_formats:
        vcodec = fmt.get("vcodec") or "none"
        acodec = fmt.get("acodec") or "none"
        ext = fmt.get("ext", "")

        # 오디오 전용 포맷
        if vcodec == "none" and acodec != "none":
            abr = fmt.get("abr") or fmt.get("tbr") or 0
            audio_formats.append({
                "format_id": fmt.get("format_id", ""),
                "ext": ext,
                "abr": int(abr) if abr else 0,
                "filesize_approx": fmt.get("filesize") or fmt.get("filesize_approx"),
            })
            continue

        # 비디오 포맷 (비디오 스트림 보유)
        if vcodec == "none":
            continue

        height = fmt.get("height")
        width = fmt.get("width")
        resolution = sanitize_resolution(height, width)

        # 같은 해상도의 중복 제거: mp4 우선, 그 다음 첫 번째 항목
        dedup_key = resolution
        if dedup_key in seen_resolutions:
            # mp4 형식이 있으면 기존 것 유지, 없으면 mp4로 교체
            existing_idx = next(
                (i for i, v in enumerate(video_formats) if v["resolution"] == resolution),
                None
            )
            if existing_idx is not None and ext == "mp4" and video_formats[existing_idx]["ext"] != "mp4":
                # mp4를 우선하여 교체
                audio_format_id = "140"  # YouTube 기본 m4a 오디오
                video_formats[existing_idx] = {
                    "format_id": f"{fmt.get('format_id', '')}+{audio_format_id}",
                    "resolution": resolution,
                    "ext": ext,
                    "filesize_approx": fmt.get("filesize") or fmt.get("filesize_approx"),
                    "vcodec": vcodec,
                    "acodec": acodec if acodec != "none" else "mp4a.40.2",
                }
            continue

        seen_resolutions.add(dedup_key)

        # 복합 format_id 구성: 비디오 전용 스트림이면 최상위 오디오와 결합
        fmt_id = fmt.get("format_id", "")
        if acodec == "none":
            # 오디오 없는 비디오 스트림: best audio와 결합
            # 실제 오디오 format_id는 /api/extract에서 bestaudio로 처리
            combined_id = f"{fmt_id}+bestaudio"
        else:
            combined_id = fmt_id

        video_formats.append({
            "format_id": combined_id,
            "resolution": resolution,
            "ext": ext if ext else "mp4",
            "filesize_approx": fmt.get("filesize") or fmt.get("filesize_approx"),
            "vcodec": vcodec,
            "acodec": acodec if acodec != "none" else "mp4a.40.2",
        })

    # 해상도 내림차순 정렬
    resolution_order = ["4K", "1440p", "1080p", "720p", "480p", "360p", "240p", "unknown"]
    video_formats.sort(
        key=lambda x: resolution_order.index(x["resolution"])
        if x["resolution"] in resolution_order
        else 99
    )

    # 오디오 비트레이트 내림차순 정렬
    audio_formats.sort(key=lambda x: x.get("abr", 0), reverse=True)

    return video_formats, audio_formats


def fetch_video_info(url: str) -> dict:
    """
    yt-dlp --dump-json 실행하여 영상 메타데이터 추출

    Returns:
        성공 시 VideoInfo dict, 실패 시 {"error": ..., "message": ...}
    """
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--dump-json",
        "--no-warnings",
        "--quiet",
        "--no-playlist",
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
        # yt-dlp 미설치 환경
        return {
            "error": ERROR_EXTRACTION,
            "message": ERROR_MESSAGES[ERROR_EXTRACTION],
        }

    if result.returncode != 0:
        error_code = classify_ytdlp_error(result.stderr)
        return {
            "error": error_code,
            "message": ERROR_MESSAGES[error_code],
        }

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        return {
            "error": ERROR_EXTRACTION,
            "message": ERROR_MESSAGES[ERROR_EXTRACTION],
        }

    raw_formats = data.get("formats", [])
    video_formats, audio_formats = extract_formats(raw_formats)

    # 썸네일: 고해상도 우선 선택
    thumbnails = data.get("thumbnails", [])
    thumbnail = data.get("thumbnail", "")
    if thumbnails:
        # 너비 기준 가장 큰 썸네일 선택
        best = max(thumbnails, key=lambda t: t.get("width", 0) or 0, default=None)
        if best:
            thumbnail = best.get("url", thumbnail)

    return {
        "id": data.get("id", ""),
        "title": data.get("title", ""),
        "thumbnail": thumbnail,
        "duration": int(data.get("duration") or 0),
        "uploader": data.get("uploader") or data.get("channel") or "",
        "platform": data.get("extractor_key", "").lower(),
        "formats": video_formats,
        "audio_formats": audio_formats,
    }


def validate_url(url: str) -> str | None:
    """
    URL 기본 유효성 검사

    Returns:
        오류 메시지 문자열(실패) 또는 None(성공)
    """
    if not url or not isinstance(url, str):
        return "url 필드가 필요합니다."
    url = url.strip()
    if not url:
        return "url 필드가 비어 있습니다."
    if not (url.startswith("http://") or url.startswith("https://")):
        return "유효한 URL을 입력해주세요. (http:// 또는 https://로 시작해야 합니다)"
    if len(url) > 2048:
        return "URL이 너무 깁니다."
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
                "error": ERROR_INVALID_URL,
                "message": "요청 본문이 비어 있습니다.",
            })
            return

        raw_body = self.rfile.read(content_length)
        try:
            body = json.loads(raw_body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {
                "error": ERROR_INVALID_URL,
                "message": "유효한 JSON 형식으로 요청해주세요.",
            })
            return

        url = body.get("url", "")
        validation_error = validate_url(url)
        if validation_error:
            self.send_json(400, {
                "error": ERROR_INVALID_URL,
                "message": validation_error,
            })
            return

        result = fetch_video_info(url.strip())

        if "error" in result:
            error_code = result["error"]
            if error_code == ERROR_TIMEOUT:
                self.send_json(504, result)
            elif error_code in (ERROR_UNSUPPORTED_URL, ERROR_PRIVATE_VIDEO, ERROR_GEO_BLOCKED):
                self.send_json(422, result)
            else:
                self.send_json(500, result)
            return

        self.send_json(200, result)
