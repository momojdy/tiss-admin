/** Parses only explicit Wantiss Goodies group invitations, not arbitrary URLs. */
export function groupInviteCodeFromLink(url: unknown): string|null {
  if(typeof url!=='string')return null;
  const match=url.trim().match(/^wantiss:\/\/goodies\/group\?([^#]*)(?:#.*)?$/i);
  if(!match)return null;
  const fields=match[1].split('&').filter(field=>/^code=/i.test(field));
  if(fields.length!==1)return null;
  try {
    const code=decodeURIComponent(fields[0].slice(5)).toUpperCase();
    // Older issued invite codes have eight characters; current codes can be longer.
    return /^[A-Z0-9]{8,16}$/.test(code)?code:null;
  } catch {return null;}
}

/** Only Wantiss group links or literal invite codes can be scanned. */
export function groupInviteCodeFromScan(value: unknown): string|null {
  if(typeof value!=='string')return null;
  const candidate=value.trim();
  if(/^[A-Z0-9]{8,16}$/i.test(candidate))return candidate.toUpperCase();
  return groupInviteCodeFromLink(candidate);
}
