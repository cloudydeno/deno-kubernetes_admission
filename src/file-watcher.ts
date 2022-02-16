export async function* watchFiles(files: Array<string>) {
  const watcher = Deno.watchFs(files, {recursive: false});

  let controller = new AbortController();

  // Need to spin this off into the background because
  // the HTTPS server will be awaited in the foreground
  (async function() {
    for await (const event of watcher) {
      if (event.kind == 'access') continue;
      controller.abort();
    }
  })()

  while (true) {
    yield controller.signal;
    console.error('Restarting server due to FS change');
    controller = new AbortController();
  }
}
