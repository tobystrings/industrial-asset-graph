import {cp,mkdir,readFile} from 'node:fs/promises';
await mkdir('dist/presentation',{recursive:true});
await cp('presentation','dist/presentation',{recursive:true});
// Fail the release if the restored tour link would ship without its player/media.
for(const file of ['index.html','player.js','audio/complete-project-film.mp3'])await readFile('dist/presentation/'+file);
console.log('Published existing project tour and original narration.');
