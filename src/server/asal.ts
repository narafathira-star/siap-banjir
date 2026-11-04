/**
 * Pemeriksaan asal request (aspek Integrity): lapisan CSRF tambahan di atas syarat
 * Content-Type application/json.
 *
 * Browser selalu menyertakan header Origin pada request lintas situs. Jika Origin ada
 * tetapi host-nya berbeda dari host yang diakses, request ditolak. Origin "null"
 * (iframe ber-sandbox, file lokal) juga ditolak.
 * Request tanpa Origin (curl, script server) tetap dilayani: itu bukan serangan CSRF
 * karena CSRF memanfaatkan browser korban.
 */
export function asalSama(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (origin === null) return true;
  const host = req.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
