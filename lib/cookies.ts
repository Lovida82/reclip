import { stat } from 'fs/promises'
import { join } from 'path'

const COOKIES_PATH = join(process.cwd(), 'data', 'cookies.txt')

/** cookies.txt 파일이 존재하면 경로 반환, 없으면 null */
export async function getCookiesPath(): Promise<string | null> {
  try {
    await stat(COOKIES_PATH)
    return COOKIES_PATH
  } catch {
    return null
  }
}
