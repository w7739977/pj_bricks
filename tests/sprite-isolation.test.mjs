import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const {segmentAtlas,maskedRegion}=createRequire(import.meta.url)('../tools/export-sprites.cjs');
function fixture() {
  const width=10,height=10,data=Buffer.alloc(width*height*4);
  const put=(x,y,color,alpha=255)=>{const p=(y*width+x)*4;data[p]=color[0];data[p+1]=color[1];data[p+2]=color[2];data[p+3]=alpha;};
  for(let x=1;x<=8;x++){put(x,1,[255,0,0]);put(x,8,[255,0,0]);}
  for(let y=2;y<8;y++){put(1,y,[255,0,0]);put(8,y,[255,0,0]);}
  for(let y=4;y<=5;y++)for(let x=4;x<=5;x++)put(x,y,[0,0,255]);
  return {width,height,data,put};
}
test('a foreign object inside the same bounding rectangle is removed rather than cropped in',()=>{
  const f=fixture(),s=segmentAtlas(f.data,f.width,f.height,{minPixels:2,fringe:0});
  assert.equal(s.groups.length,2);
  const red=s.groups.find(g=>g.x===1),out=maskedRegion(f.data,f.width,s.labels,red);
  assert.equal(out.excluded,4);
  for(let p=0;p<out.data.length;p+=4)if(out.data[p+3]){
    assert.equal(out.data[p],255);assert.equal(out.data[p+2],0);
  }
  const blue=s.groups.find(g=>g.x===4),blueOut=maskedRegion(f.data,f.width,s.labels,blue);
  assert.equal(blueOut.kept,4);
  assert.equal(blueOut.excluded,0);
});
test('anti-aliased edges retain their original alpha while nearby other cores stay separate',()=>{
  const f=fixture();f.put(0,2,[230,0,0],32);
  const s=segmentAtlas(f.data,f.width,f.height,{minPixels:2,fringe:3});
  const red=s.groups.find(g=>g.x===0),out=maskedRegion(f.data,f.width,s.labels,red);
  const pixel=((2-red.y)*red.width+0)*4;
  assert.equal(out.data[pixel+3],32);assert.equal(out.data[pixel],230);
  assert.notEqual(s.labels[4*f.width+4],red.label);
});
test('all twenty exported sprites correspond to the validated isolation manifest',()=>{
  const m=JSON.parse(readFileSync(new URL('../dist/assets/sprites/manifest.json',import.meta.url)));
  assert.equal(m.sprites.length,20);
  assert.equal(new Set(m.sprites.map(s=>s.name)).size,20);
  assert.ok(m.sprites.some(s=>s.excludedForeignPixels>0),'source rectangles overlap actual foreign pixels');
  for(const sprite of m.sprites){
    const bytes=readFileSync(new URL(`../dist/assets/sprites/${sprite.file}`,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),sprite.sha256);
    assert.ok(sprite.keptSourcePixels>0);
  }
});
