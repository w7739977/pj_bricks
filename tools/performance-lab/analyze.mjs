import {readFile} from 'node:fs/promises';

const files=process.argv.slice(2);
if(!files.length){console.error('Usage: node tools/performance-lab/analyze.mjs report.json [...]');process.exit(2);}
let insufficient=false,jank=false;
const results=[];
for(const file of files){
  const report=JSON.parse(await readFile(file,'utf8'));
  let count=0;
  for(const sample of report.sessions||[]){
    if(sample.kind!=='drag')continue;
    count++;
    const valid=!sample.cancelled&&sample.frames?.length>=30&&sample.moves>=10&&sample.movedLayerObserved;
    const frameP95=sample.frameStats?.p95??null;
    const releaseMax=sample.releaseStats?.max??null;
    const slowRatio=sample.frames?.length?sample.slowFrames/sample.frames.length:null;
    const hasJank=valid&&(releaseMax>50||slowRatio>.05||sample.longTasks?.length>0);
    if(!valid||releaseMax===null)insufficient=true;
    if(hasJank)jank=true;
    results.push({file,id:sample.id,variant:sample.variant,inputMode:sample.inputMode,valid,frames:sample.frames?.length||0,moves:sample.moves,frameP95Ms:frameP95,releaseMaxMs:releaseMax,slowRatio,verdict:!valid?'insufficient':hasJank?'jank':'no jank observed'});
  }
  if(!count)insufficient=true;
}
console.log(JSON.stringify({results,notes:'rAF cadence is not GPU presentation FPS or an iPhone device acceptance test.'},null,2));
process.exitCode=insufficient?2:jank?1:0;
