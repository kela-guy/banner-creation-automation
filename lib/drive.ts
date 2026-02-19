const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink";
const GSI_SRC = "https://accounts.google.com/gsi/client";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token: string }) => void;
          }) => { requestAccessToken: (options?: { prompt?: string }) => void };
        };
      };
    };
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Request a Google access token for Drive (scope drive.file).
 * Loads GSI script and triggers sign-in if needed.
 * Requires NEXT_PUBLIC_GOOGLE_CLIENT_ID to be set.
 */
export function getDriveAccessToken(): Promise<string> {
  const clientId = typeof process !== "undefined" && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set. Add it to .env.local to enable Drive upload."));
  }
  return loadScript(GSI_SRC).then(() => {
    return new Promise<string>((resolve, reject) => {
      if (!window.google?.accounts?.oauth2) {
        reject(new Error("Google Identity Services not available"));
        return;
      }
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: (response) => {
          if (response.access_token) resolve(response.access_token);
          else reject(new Error("No access token received"));
        },
      });
      client.requestAccessToken({ prompt: "" });
    });
  });
}

/**
 * Upload a single file to the user's Drive. Uses multipart (max 5MB per file).
 */
export async function uploadToDrive(
  accessToken: string,
  fileName: string,
  base64Data: string,
  mimeType = "image/png"
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const metadata = { name: fileName, mimeType };
  const binary = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
  const fileBlob = new Blob([binary], { type: mimeType });
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", fileBlob, fileName);

  const res = await fetch(DRIVE_UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Drive upload failed: ${res.status}`);
  }
  return res.json() as Promise<{ id: string; name: string; webViewLink?: string }>;
}
