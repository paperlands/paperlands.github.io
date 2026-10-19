// The one way this repository opens the pinned runtime.
//
// The act's viewport (`stage.mjs`) and the probe rig (`design/probe/fourth-turn-stage.mjs`)
// both come through here, so a pin change lands in one place and a probe can never drift onto
// a different artifact than the page ships. The built frame templates its pin from
// `site.data.hatch.artifact_path`; a page served without Jekyll (the study, the probe rig)
// reads the same YAML instead, and never fetches private or unpublished data.
export async function pinPath({ dataset = document.body.dataset } = {}) {
  if (dataset.hatch) return dataset.hatch;
  const response = await fetch('../../_data/hatch.yml');
  if (!response.ok) throw new Error('The Paperlang pin is unavailable.');
  const path = /^artifact_path:\s*(\/assets\/lib\/hatch\/\S+)\s*$/m.exec(await response.text())?.[1];
  if (!path) throw new Error('The Paperlang pin is unavailable.');
  return path;
}

// The factory, and the artifact it came from, so every caller can report the pin it opened.
export async function hatchFactory(options) {
  const path = await pinPath(options);
  const { createHatch } = await import(path);
  return { path, createHatch };
}
