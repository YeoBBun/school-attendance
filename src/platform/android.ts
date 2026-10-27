/**
 * 휴대폰 '출결' 앱(android-widget/) 안에서 열렸을 때 앱이 넣어 주는 연결.
 * 앱 화면(WebView) 안에서는 파일 내려받기·공유가 그냥은 안 돼서 앱에 맡긴다.
 */
interface AndroidBridge {
  /** 저장 위치를 고르는 창을 띄워 저장한다 */
  saveFile(name: string, mime: string, base64: string): void;
  /** 공유 창(구글 드라이브 등)으로 보낸다 */
  shareFile(name: string, mime: string, base64: string): void;
  /** 위젯이 같은 동기화 설정으로 받을 서류를 받아 오게 넘긴다 (끄면 빈 문자열). 이전 버전 앱에는 없다 */
  setSyncConfig?(json: string): void;
}

export function androidApp(): AndroidBridge | undefined {
  return (window as unknown as { AttendanceApp?: AndroidBridge }).AttendanceApp;
}

export function blobBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ''));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
