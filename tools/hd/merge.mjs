import {NodeIO} from '@gltf-transform/core';
const io=new NodeIO();const [,,base,out,...anims]=process.argv;
const doc=await io.read(base);const root=doc.getRoot();const buf=root.listBuffers()[0];
const byName=new Map(root.listNodes().map(n=>[n.getName(),n]));
for(const a of root.listAnimations())a.dispose();
for(const spec of anims){const [file,name]=spec.split('=');const src=await io.read(file);
 for(const sa of src.getRoot().listAnimations()){const A=doc.createAnimation(name);
  for(const ch of sa.listChannels()){const tn=byName.get(ch.getTargetNode().getName());if(!tn)continue;const s=ch.getSampler();
   const cp=acc=>doc.createAccessor().setType(acc.getType()).setArray(acc.getArray().slice()).setBuffer(buf);
   const S=doc.createAnimationSampler().setInput(cp(s.getInput())).setOutput(cp(s.getOutput())).setInterpolation(s.getInterpolation());
   A.addSampler(S).addChannel(doc.createAnimationChannel().setTargetNode(tn).setTargetPath(ch.getTargetPath()).setSampler(S));}
  break;}}
await io.write(out,doc);console.log('ok',root.listAnimations().map(a=>a.getName()+':'+a.listChannels().length));
