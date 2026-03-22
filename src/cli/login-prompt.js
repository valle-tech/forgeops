/** Minimal readline for login (hidden token). */
export function promptLine(q, hidden = false) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(q);
    if (hidden && stdin.isTTY) {
      stdin.setRawMode(true);
    }
    let buf = '';
    const onData = (b) => {
      const s = b.toString('utf8');
      if (hidden && stdin.isTTY) {
        for (const ch of s) {
          if (ch === '\n' || ch === '\r' || ch === '\u0004') {
            cleanup();
            stdin.setRawMode(false);
            stdout.write('\n');
            resolve(buf);
            return;
          }
          buf += ch;
        }
        return;
      }
      buf += s;
      if (buf.endsWith('\n')) {
        cleanup();
        resolve(buf.trim());
      }
    };
    function cleanup() {
      stdin.off('data', onData);
    }
    stdin.on('data', onData);
  });
}
