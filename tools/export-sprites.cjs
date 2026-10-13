// Export existing artwork to isolated game textures; no character is redrawn.
// Optional build-time dependency: sharp. Runtime game has no dependency on this tool.
function segmentAtlas(data,width,height,{threshold=80,minPixels=1800,fringe=3}={}) {
  const total=width*height,labels=new Uint16Array(total),queue=new Int32Array(total),groups=[];
  let id=0;
  for(let n=0;n<total;n++) {
    if(labels[n] || data[n*4+3]<threshold)continue;
    id++;let top=0,size=0,minX=width,minY=height,maxX=0,maxY=0;
    queue[top++]=n;labels[n]=id;
    while(top) {
      const p=queue[--top],x=p%width,y=Math.floor(p/width);
      size++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      const neighbours=[x>0?p-1:-1,x+1<width?p+1:-1,y>0?p-width:-1,y+1<height?p+width:-1];
      for(const q of neighbours)if(q>=0&&!labels[q]&&data[q*4+3]>=threshold){labels[q]=id;queue[top++]=q;}
    }
    if(size>=minPixels)groups.push({label:id,x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1,size});
  }
  groups.sort((a,b)=>Math.floor((a.y+a.height/2)/(height/4))-Math.floor((b.y+b.height/2)/(height/4))||a.x-b.x);
  const map=new Map(groups.map((group,i)=>[group.label,i+1]));
  let head=0,tail=0;
  const distance=new Uint8Array(total);
  for(let p=0;p<total;p++){labels[p]=map.get(labels[p])||0;if(labels[p])queue[tail++]=p;}
  // Include anti-aliased edge pixels, while forbidding growth into any other core.
  while(head<tail) {
    const p=queue[head++];if(distance[p]>=fringe)continue;
    const x=p%width,y=Math.floor(p/width);
    const neighbours=[x>0?p-1:-1,x+1<width?p+1:-1,y>0?p-width:-1,y+1<height?p+width:-1];
    for(const q of neighbours)if(q>=0&&!labels[q]&&data[q*4+3]>0&&data[q*4+3]<threshold){
      labels[q]=labels[p];distance[q]=distance[p]+1;queue[tail++]=q;
    }
  }
  const bounds=groups.map(()=>({minX:width,minY:height,maxX:0,maxY:0}));
  for(let p=0;p<total;p++)if(labels[p]){
    const b=bounds[labels[p]-1],x=p%width,y=Math.floor(p/width);
    b.minX=Math.min(b.minX,x);b.maxX=Math.max(b.maxX,x);b.minY=Math.min(b.minY,y);b.maxY=Math.max(b.maxY,y);
  }
  return {labels,groups:groups.map((g,i)=>({...g,label:i+1,x:bounds[i].minX,y:bounds[i].minY,width:bounds[i].maxX-bounds[i].minX+1,height:bounds[i].maxY-bounds[i].minY+1}))};
}
function maskedRegion(data,width,labels,group) {
  const out=Buffer.alloc(group.width*group.height*4);let kept=0,excluded=0;
  for(let y=0;y<group.height;y++)for(let x=0;x<group.width;x++) {
    const p=(group.y+y)*width+group.x+x,d=(y*group.width+x)*4;
    if(labels[p]===group.label){for(let c=0;c<4;c++)out[d+c]=data[p*4+c];kept++;}
    else if(data[p*4+3]>0)excluded++;
  }
  return {data:out,kept,excluded};
}
module.exports={segmentAtlas,maskedRegion};
if(require.main===module) {
  const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
  (async()=>{
    const source=process.argv[2],dest=process.argv[3];
    if(!source||!dest)throw Error('Usage: node tools/export-sprites.cjs INPUT_PNG OUTPUT_DIRECTORY');
    const names=['broccoli','lettuce','tomato','carrot','corn','eggplant','onion','potato','cucumber','pepper','pumpkin','grape','apple','strawberry','banana','orange','pear','cherry','peach','watermelon'];
    const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const segmented=segmentAtlas(data,info.width,info.height);
    if(segmented.groups.length!==names.length)throw Error(`Expected 20 characters, found ${segmented.groups.length}`);
    fs.mkdirSync(dest,{recursive:true});
    const sprites=[];
    for(let i=0;i<names.length;i++){
      const g=segmented.groups[i],masked=maskedRegion(data,info.width,segmented.labels,g);
      const output=await sharp(masked.data,{raw:{width:g.width,height:g.height,channels:4}})
        .resize(156,156,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}})
        .extend({top:2,bottom:2,left:2,right:2,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
      const file=names[i]+'.png';fs.writeFileSync(path.join(dest,file),output);
      sprites.push({name:names[i],file,width:160,height:160,sourceBounds:{x:g.x,y:g.y,width:g.width,height:g.height},keptSourcePixels:masked.kept,excludedForeignPixels:masked.excluded,sha256:crypto.createHash('sha256').update(output).digest('hex')});
    }
    const manifest={source:path.basename(source),sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex'),exportRule:'connected alpha component plus three-pixel anti-aliased fringe; foreign components transparent',sprites};
    fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    console.log(JSON.stringify({exported:sprites.length,totalBytes:sprites.reduce((sum,s)=>sum+fs.statSync(path.join(dest,s.file)).size,0),foreignPixelsExcluded:sprites.reduce((sum,s)=>sum+s.excludedForeignPixels,0)}));
  })().catch(error=>{console.error(error);process.exit(1);});
}
