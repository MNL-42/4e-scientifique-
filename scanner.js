/* SCIENCE 4 — scanner de cahier vers Word, traitement local dans le navigateur */
(() => {
  const $=s=>document.querySelector(s);
  const camera=$("#scanner-camera"),gallery=$("#scanner-gallery"),pagesRoot=$("#scanner-pages");
  const run=$("#scanner-run"),output=$("#scanner-text"),exportBtn=$("#scanner-export-word"),publishBtn=$("#scanner-publish"),progress=$("#scanner-progress");
  if(!camera||!gallery||!pagesRoot)return;
  let files=[],worker=null;
  const say=t=>{if(progress)progress.textContent=t;};
  function drawPages(){
    pagesRoot.replaceChildren();
    if(!files.length){pagesRoot.innerHTML='<div class="empty-state"><strong>Aucune page ajoutée.</strong><span>Prends une photo ou importe les images de ton cahier.</span></div>';run.disabled=true;return;}
    files.forEach((file,index)=>{
      const card=document.createElement("div");card.className="scanner-page";
      const img=document.createElement("img");img.src=URL.createObjectURL(file);img.alt="Page "+(index+1);
      const caption=document.createElement("span");caption.textContent="Page "+(index+1);
      const remove=document.createElement("button");remove.type="button";remove.textContent="Retirer";remove.addEventListener("click",()=>{files.splice(index,1);drawPages()});
      card.append(img,caption,remove);pagesRoot.append(card);
    });
    run.disabled=false;
  }
  function addFiles(list){
    const accepted=[...list].filter(f=>/^image\/(jpeg|png|webp)$/.test(f.type));
    if(!accepted.length){say("Choisis des photos JPG, PNG ou WebP.");return;}
    if(files.length+accepted.length>30){say("Maximum 30 pages par document. Pour un cahier plus long, publie-le en plusieurs chapitres.");return;}
    if(accepted.some(f=>f.size>12*1024*1024)){say("Chaque image doit faire moins de 12 Mo.");return;}
    files.push(...accepted);drawPages();say(files.length+" page(s) prête(s) à scanner.");
  }
  camera.addEventListener("change",e=>{addFiles(e.target.files);camera.value=""});
  gallery.addEventListener("change",e=>{addFiles(e.target.files);gallery.value=""});
  async function loadScript(src,test){
    if(test())return;
    await new Promise((resolve,reject)=>{
      const script=document.createElement("script");script.src=src;script.async=true;
      script.onload=resolve;script.onerror=()=>reject(new Error("Impossible de charger le module de numérisation."));
      document.head.append(script);
    });
    if(!test())throw new Error("Le module n’a pas pu démarrer.");
  }
  async function getWorker(){
    if(worker)return worker;
    await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",()=>!!window.Tesseract);
    worker=await window.Tesseract.createWorker("fra",1,{logger:m=>{
      if(m.status==="recognizing text")say("Reconnaissance en cours : "+Math.round((m.progress||0)*100)+" %");
      else if(m.status)say("Initialisation : "+m.status);
    }});
    return worker;
  }
  async function prepareImage(file){
    const image=await createImageBitmap(file);
    const scale=Math.min(1,1900/Math.max(image.width,image.height));
    const canvas=document.createElement("canvas");canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    ctx.drawImage(image,0,0,canvas.width,canvas.height);image.close?.();
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    for(let i=0;i<pixels.data.length;i+=4){
      const gray=0.299*pixels.data[i]+0.587*pixels.data[i+1]+0.114*pixels.data[i+2];
      const adjusted=Math.max(0,Math.min(255,(gray-128)*1.22+128));
      pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=adjusted;
    }
    ctx.putImageData(pixels,0,0);
    return await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",0.9));
  }
  run.addEventListener("click",async()=>{
    if(!files.length)return;
    run.disabled=true;exportBtn.disabled=true;output.value="";
    try{
      const ocr=await getWorker(),chunks=[];
      for(let i=0;i<files.length;i++){
        say("Préparation de la page "+(i+1)+"/"+files.length+"…");
        const image=await prepareImage(files[i]);
        const result=await ocr.recognize(image);
        chunks.push("PAGE "+(i+1)+"\n\n"+(result.data.text||"").trim());
      }
      output.value=chunks.join("\n\n────────────────────────\n\n");
      exportBtn.disabled=!output.value.trim();if(publishBtn)publishBtn.disabled=!output.value.trim();
      say("Numérisation terminée. Relis le texte, puis corrige les erreurs avant l’export Word.");
    }catch(error){console.error(error);say(error.message||"Erreur pendant la reconnaissance. Réessaie avec une photo plus nette.");}
    finally{run.disabled=!files.length;}
  });
  async function buildDocxBlob(){
    const text=output.value.trim();if(!text)throw new Error("Aucun texte reconnu à exporter.");
    await loadScript("https://cdn.jsdelivr.net/npm/docx@9/dist/index.iife.js",()=>!!window.docx);
    const {Document,Packer,Paragraph,HeadingLevel}=window.docx;
    const name=($("#scanner-doc-name").value.trim()||"Notes de cours 4e Scientifique D").replace(/[\\/:*?"<>|]/g,"-");
    const children=[new Paragraph({text:name,heading:HeadingLevel.TITLE}),new Paragraph({text:"4e Scientifique D — Institut de la Gombe 2"}),new Paragraph({text:"Texte reconnu à partir des pages photographiées. Document à relire et corriger."}),...text.split(/\r?\n/).map(line=>new Paragraph({text:line||" "}))];
    const doc=new Document({sections:[{properties:{},children}]});
    return {blob:await Packer.toBlob(doc),name};
  }
  exportBtn.addEventListener("click",async()=>{
    if(!output.value.trim())return;exportBtn.disabled=true;
    try{const {blob,name}=await buildDocxBlob();const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name+".docx";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);say("Document Word créé. Relis-le avant publication.");}
    catch(error){console.error(error);say(error.message||"La création Word a échoué.");}
    finally{exportBtn.disabled=!output.value.trim();}
  });
  publishBtn?.addEventListener("click",async()=>{
    if(!output.value.trim())return;const month=$("#scanner-month").value;if(!month){say("Choisis le mois du cours avant de publier.");return;}
    publishBtn.disabled=true;
    try{const {blob,name}=await buildDocxBlob();if(typeof window.SCIENCE4_PUBLISH_DOCX!=="function")throw new Error("Service de publication indisponible. Recharge la page.");await window.SCIENCE4_PUBLISH_DOCX(blob,name,$("#scanner-subject").value,$("#scanner-chapter").value.trim(),month);say("Cours Word publié dans la bibliothèque. Les élèves peuvent maintenant le consulter.");}
    catch(error){console.error(error);say(error.message||"Publication impossible.");}
    finally{publishBtn.disabled=!output.value.trim();}
  });
})();