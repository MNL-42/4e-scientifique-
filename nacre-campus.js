/* SCIENCE 4 — intégration réelle du campus NACRE */
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const say = message => {
    const box=$("#toast");
    if(box){box.textContent=message;box.classList.add("show");clearTimeout(window.science4Toast);window.science4Toast=setTimeout(()=>box.classList.remove("show"),3200);}
  };
  let profile=null, role=null, subjectRows=[], assignmentRows=[];
  const staff = () => role==="professeur" || role==="admin";
  const admin = () => role==="admin";
  const deviceLabel = () => ("SCIENCE 4 · "+(navigator.platform||"mobile")).slice(0,80);

  function setIdentity(p,r){
    profile=p; role=r;
    const full=[p?.prenom,p?.postnom,p?.nom].filter(Boolean).join(" ");
    $("#profile-name").textContent=full||"Visiteur";
    $("#top-user").textContent=p?.prenom||"Visiteur";
    $("#profile-role-label").textContent=r==="admin"?"Administrateur":r==="professeur"?"Professeur":"Élève";
    const initial=(p?.prenom||"É").charAt(0).toUpperCase();
    $("#avatar-small").textContent=initial;$("#profile-avatar").textContent=initial;
    $("#profile-form").hidden=!!p;
    const status=$("#teacher-access-title"), desc=$("#teacher-access-text");
    if(status&&desc){
      status.textContent=staff()?"Accès pédagogique autorisé":"Accès réservé aux enseignants";
      desc.textContent=staff()?"Ton compte est autorisé par NACRE. Les actions restent contrôlées par les règles de la base.":"Pour devenir professeur, l’administration doit te remettre un code d’invitation. Un nom ou un symbole @ ne donne aucun droit.";
    }
    $$(".teacher-grid form, #teacher-submissions-panel").forEach(el=>el.hidden=!staff());
    const invite=$("#admin-invite-panel");if(invite)invite.hidden=!admin();
    if($("#teacher-invite-note"))$("#teacher-invite-note").hidden=!admin();
  }

  async function getContext(){
    const {data,error}=await supa.rpc("my_context");
    if(error)throw error;
    if(data?.registered && !data?.suspended){
      setIdentity(data.profile,data.role);
      return true;
    }
    profile=null;role=null;
    $("#profile-name").textContent="Visiteur";$("#top-user").textContent="Visiteur";$("#profile-role-label").textContent="Aucun profil enregistré";$("#avatar-small").textContent="É";$("#profile-avatar").textContent="É";
    $("#profile-form").hidden=false;
    $("#teacher-access-title").textContent=data?.suspended?"Compte suspendu":"Aucun profil de classe";
    $("#teacher-access-text").textContent=data?.suspended?"Ce compte est suspendu. Contacte l’administration de la classe.":"Crée ton profil. Les élèves s’inscrivent directement ; les professeurs doivent utiliser un code d’invitation valide.";
    $$(".teacher-grid form, #teacher-submissions-panel").forEach(el=>el.hidden=true);
    if($("#admin-invite-panel"))$("#admin-invite-panel").hidden=true;
    return false;
  }

  function populateSubjects(){
    const options=subjectRows.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+'</option>').join("");
    ["#assignment-subject","#resource-subject"].forEach(sel=>{
      const el=$(sel);if(!el)return;el.innerHTML=options;
    });
  }
  async function loadSubjects(){
    const {data,error}=await supa.from("subjects").select("id,slug,name,position").eq("active",true).order("position");
    if(error){console.warn("Matières NACRE:",error);return;}
    subjectRows=data||[];populateSubjects();
  }

  async function loadCourses(){
    const root=$("#course-list");if(!root)return;
    const {data:rows,error}=await supa.from("courses").select("id,subject_id,title,description,course_month,created_at").eq("status","publie").order("course_month",{ascending:false}).order("created_at",{ascending:false}).limit(150);
    if(error){console.warn("Cours:",error);return;}
    if(!rows?.length){courses.splice(0);renderCourses();return;}
    const ids=rows.map(x=>x.id);
    const {data:docs,error:docError}=await supa.from("course_documents").select("course_id,bucket,storage_path,file_name").in("course_id",ids).order("page_order");
    if(docError){console.warn("Documents:",docError);return;}
    const items=[];
    for(const row of rows){
      const subject=subjectRows.find(s=>s.id===row.subject_id)?.name||"Cours";
      const attached=(docs||[]).filter(d=>d.course_id===row.id);
      for(const doc of attached){
        const {data:link,error:linkError}=await supa.storage.from(doc.bucket).createSignedUrl(doc.storage_path,3600);
        items.push({title:row.title,subject,chapter:row.description||"Support pédagogique",month:(row.course_month||row.created_at.slice(0,10)).slice(0,7),url:linkError?"#":link.signedUrl});
      }
    }
    courses.splice(0,courses.length,...items);
    const monthSelect=$("#course-month-filter");
    if(monthSelect){const previous=monthSelect.value;const months=[...new Set(items.map(x=>x.month?.slice(0,7)).filter(Boolean))].sort().reverse();monthSelect.innerHTML='<option value="">Tous les mois</option>'+months.map(m=>'<option value="'+m+'">'+new Date(m+"-15T12:00:00").toLocaleDateString("fr-FR",{month:"long",year:"numeric"})+'</option>').join("");if(months.includes(previous))monthSelect.value=previous;}
    renderCourses();
  }

  async function loadAssignments(){
    const root=$("#assignment-list");if(!root||!supa)return;
    const {data:rows,error}=await supa.from("assignments").select("id,subject_id,title,instructions,due_at,points,kind,teacher_id,created_at").eq("status","publie").order("created_at",{ascending:false}).limit(60);
    if(error){console.warn("Devoirs:",error);root.innerHTML='<div class="empty-state"><strong>Chargement des devoirs impossible.</strong><span>Réessaie lorsque la connexion est disponible.</span></div>';return;}
    assignmentRows=rows||[];
    const {data:mine,error:mineError}=await supa.from("assignment_submissions").select("id,assignment_id,student_id,answer_text,files,status,submitted_at,visibility").order("submitted_at",{ascending:false}).limit(100);
    if(mineError)console.warn("Copies:",mineError);
    const submissions=mine||[];
    const done=new Set(submissions.map(s=>s.assignment_id));
    let filtered=assignmentRows;
    if(assignmentFilter==="À faire")filtered=filtered.filter(a=>!done.has(a.id));
    if(assignmentFilter==="Terminés")filtered=filtered.filter(a=>done.has(a.id));
    root.replaceChildren();
    if(!filtered.length){
      const empty=document.createElement("div");empty.className="empty-state large-empty";
      empty.innerHTML=assignmentRows.length?'<strong>Aucun devoir dans cette catégorie.</strong><span>Change le filtre pour consulter les autres travaux.</span>':'<strong>Aucun devoir publié pour le moment.</strong><span>Les devoirs ajoutés par les professeurs apparaîtront ici.</span>';
      root.append(empty);return;
    }
    for(const a of filtered){
      const card=document.createElement("article");card.className="panel assignment-card";
      const subject=subjectRows.find(s=>s.id===a.subject_id)?.name||"Travail scolaire";
      const tag=document.createElement("p");tag.className="eyebrow";tag.textContent=subject+" · "+String(a.kind||"devoir").toUpperCase();
      const title=document.createElement("h3");title.textContent=a.title;
      const body=document.createElement("p");body.textContent=a.instructions||"Aucune consigne complémentaire.";
      const due=document.createElement("span");due.className="muted-note";due.textContent=a.due_at?"À rendre avant le "+new Date(a.due_at).toLocaleString("fr-FR"):"Date limite non précisée";
      card.append(tag,title,body,due);
      const own=submissions.find(s=>s.assignment_id===a.id);
      if(own){
        const ownBox=document.createElement("div");ownBox.className="submission-own";
        const ownTitle=document.createElement("strong");ownTitle.textContent="Ton travail : "+(own.visibility==="public"?"visible par la classe":"privé, visible par toi et le professeur");
        const ownText=document.createElement("p");ownText.textContent=own.answer_text||"Fichier(s) joint(s) envoyé(s).";
        ownBox.append(ownTitle,ownText);card.append(ownBox);
        const {data:feedbackRows}=await supa.from("submission_comments").select("body,created_at").eq("submission_id",own.id).order("created_at",{ascending:true}).limit(20);
        if(feedbackRows?.length){const feedbackBox=document.createElement("div");feedbackBox.className="submission-feedback";const fh=document.createElement("strong");fh.textContent="Retours privés";feedbackBox.append(fh);feedbackRows.forEach(note=>{const p=document.createElement("p");p.textContent=note.body;feedbackBox.append(p)});card.append(feedbackBox);}
      }else if(role==="eleve"){
        const form=document.createElement("form");form.className="student-submission-form";form.dataset.assignment=a.id;
        form.innerHTML='<label>Ta réponse<textarea name="answer" rows="4" maxlength="10000" placeholder="Écris ta réponse ou explique ta méthode…"></textarea></label><label>Fichier(s) facultatif(s) <input name="files" type="file" multiple accept=".pdf,image/jpeg,image/png,image/webp"></label><label>Confidentialité<select name="visibility"><option value="private">Privé — seulement moi et le professeur</option><option value="public">Public — partagé avec la classe</option></select></label><p class="form-note">Par défaut, ta copie reste privée. Si tu choisis Public, les autres élèves pourront lire le texte de ta réponse.</p><button class="button button-dark" type="submit">Envoyer au professeur</button>';
        card.append(form);
      }
      const publicRows=submissions.filter(s=>s.assignment_id===a.id&&s.visibility==="public"&&s.student_id!==profile?.id);
      if(publicRows.length){
        const list=document.createElement("div");list.className="public-submissions";
        const h=document.createElement("strong");h.textContent="Réponses partagées avec la classe";list.append(h);
        publicRows.forEach(s=>{const p=document.createElement("p");p.textContent=s.answer_text||"Réponse avec pièce jointe.";list.append(p)});
        card.append(list);
      }
      root.append(card);
    }
  }

  async function submitAssignment(form){
    const assignmentId=form.dataset.assignment, answer=form.elements.answer.value.trim();
    const files=[...form.elements.files.files];
    if(!answer&&!files.length){say("Ajoute une réponse ou un fichier avant l’envoi.");return;}
    if(files.length>6){say("Maximum : 6 fichiers par devoir.");return;}
    const allowedTypes=["application/pdf","image/jpeg","image/png","image/webp"];
    if(files.some(f=>!allowedTypes.includes(f.type))){say("Formats autorisés : PDF, JPG, PNG et WebP.");return;}
    if(files.some(f=>f.size>10*1024*1024)){say("Chaque fichier doit faire moins de 10 Mo.");return;}
    const uploaded=[];
    for(const file of files){
      const safe=file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g,"-");
      const path=profile.id+"/"+assignmentId+"/"+Date.now()+"-"+safe;
      const {error}=await supa.storage.from("reponses").upload(path,file,{contentType:file.type||"application/octet-stream",upsert:false});
      if(error){console.error(error);say("Un fichier n’a pas pu être envoyé. Réessaie.");return;}
      uploaded.push({bucket:"reponses",path,file_name:file.name,mime_type:file.type||"application/octet-stream",size_bytes:file.size});
    }
    const visibility=form.elements.visibility.value;
    const {error}=await supa.from("assignment_submissions").insert({assignment_id:assignmentId,answer_text:answer||null,files:uploaded,visibility});
    if(error){console.error(error);say(error.code==="23505"?"Tu as déjà envoyé ce devoir.":"Envoi impossible. Vérifie la connexion et réessaie.");return;}
    say(visibility==="private"?"Copie envoyée en privé au professeur.":"Copie envoyée et partagée avec la classe.");
    await loadAssignments();
  }

  async function loadTeacherSubmissions(){
    const root=$("#teacher-submissions");if(!root||!staff())return;
    const {data:as,error}=await supa.from("assignments").select("id,title").eq("teacher_id",profile.id).order("created_at",{ascending:false}).limit(50);
    if(error){console.warn(error);return;}
    if(!as?.length){root.innerHTML='<div class="empty-state"><strong>Aucune copie reçue pour le moment.</strong><span>Les travaux des élèves apparaîtront ici après leur envoi.</span></div>';return;}
    const ids=as.map(a=>a.id);
    const {data:subs,error:subError}=await supa.from("assignment_submissions").select("id,assignment_id,student_id,answer_text,files,status,submitted_at,visibility").in("assignment_id",ids).order("submitted_at",{ascending:false}).limit(150);
    if(subError){console.warn(subError);root.textContent="Impossible de charger les copies.";return;}
    const studentIds=[...new Set((subs||[]).map(s=>s.student_id))];
    let people=[];
    if(studentIds.length){const res=await supa.from("profiles").select("id,nom,postnom,prenom").in("id",studentIds);people=res.data||[];}
    root.replaceChildren();
    if(!subs?.length){root.innerHTML='<div class="empty-state"><strong>Aucune copie reçue.</strong><span>Les élèves n’ont pas encore envoyé leurs travaux.</span></div>';return;}
    for(const s of subs){
      const card=document.createElement("article");card.className="submission-teacher-card";
      const who=people.find(p=>p.id===s.student_id);
      const task=as.find(a=>a.id===s.assignment_id);
      const h=document.createElement("h4");h.textContent=[who?.prenom,who?.postnom,who?.nom].filter(Boolean).join(" ")||"Élève";
      const meta=document.createElement("p");meta.className="eyebrow";meta.textContent=(task?.title||"Devoir")+" · "+(s.visibility==="public"?"PUBLIC":"PRIVÉ")+" · "+new Date(s.submitted_at).toLocaleString("fr-FR");
      const body=document.createElement("p");body.textContent=s.answer_text||"Aucune réponse écrite.";
      card.append(meta,h,body);
      for(const f of (s.files||[])){
        const {data:link}=await supa.storage.from(f.bucket||"reponses").createSignedUrl(f.path,3600);
        if(link?.signedUrl){const a=document.createElement("a");a.href=link.signedUrl;a.target="_blank";a.rel="noopener";a.textContent="Ouvrir "+(f.file_name||"la pièce jointe");card.append(a);}
      }
      const feedback=document.createElement("form");feedback.className="teacher-feedback-form";feedback.dataset.submission=s.id;
      feedback.innerHTML='<label>Retour privé à l’élève<textarea name="body" rows="2" maxlength="3000" required placeholder="Conseil, correction ou explication…"></textarea></label><button type="submit">Envoyer le retour</button>';
      card.append(feedback);root.append(card);
    }
  }

  let activeNewsFilter="tout";
  const newsCacheKey="science4_exetat_news_v1";
  const newsTtl=30*60*1000;
  let liveExamNews=[];
  function classifyExamNews(text){
    const t=String(text||"").toLowerCase();
    if(/dipl[oô]me|diplomas|e-dipl[oô]me|palmar[eè]s/.test(t))return "diplomes";
    if(/calendrier|date limite|inscription|pr[eé]liminaire|dissertation|hors.session|session ordinaire/.test(t))return "calendrier";
    if(/r[eé]sultat|d[eé]lib[eé]ration|correction|palmar[eè]s/.test(t))return "resultats";
    if(/dissertation|oral|pratique professionnelle|[eé]preuve/.test(t))return "epreuves";
    if(/inscription|inscrit|enr[oô]lement|candidat|centre de passation/.test(t))return "inscriptions";
    if(/ex[eé]tat|examen d.?[eé]tat|examen d.?etat/.test(t))return "exetat";
    return "autre";
  }
  function newsDate(value){const d=new Date(value);return Number.isNaN(d.getTime())?"Date non précisée":d.toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});}
  async function fetchLiveExamNews(force=false){
    try{
      const cached=JSON.parse(localStorage.getItem(newsCacheKey)||"null");
      if(cached?.items?.length){liveExamNews=cached.items;}
      if(!force&&cached?.items?.length&&Date.now()-cached.time<newsTtl)return;
      const query='EXETAT OR "Examen d’État" OR "diplôme d’État" RDC';
      const rss="https://news.google.com/rss/search?q="+encodeURIComponent(query)+"&hl=fr&gl=CD&ceid=CD:fr";
      const endpoint="https://api.rss2json.com/v1/api.json?rss_url="+encodeURIComponent(rss);
      const response=await fetch(endpoint,{cache:"no-store"});
      if(!response.ok)throw new Error("Flux d’actualités indisponible");
      const data=await response.json();
      if(data.status!=="ok"||!Array.isArray(data.items))throw new Error("Flux sans résultats");
      const seen=new Set();
      liveExamNews=data.items.map(item=>{
        const title=String(item.title||"").replace(/\\s+-\\s+[^-]+$/,"").trim();
        const summary=String(item.description||"").replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/\\s+/g," ").trim().slice(0,320);
        const url=item.link||"";
        if(!title||!url||seen.has(url))return null;seen.add(url);
        const category=classifyExamNews(title+" "+summary);
        if(category==="autre"&&!/ex[eé]tat|examen d.?[eé]tat|dipl[oô]me d.?[eé]tat/i.test(title+" "+summary))return null;
        let image=item.thumbnail||item.enclosure?.link||"";
        const host=(()=>{try{return new URL(url).hostname.replace(/^www\\./,"")}catch{return "Presse"}})();
        return {category,title,summary,source_name:item.author||host,source_url:url,published_on:item.pubDate||new Date().toISOString(),is_official:/edu-nc\\.gouv\\.cd|minepst\\.gouv\\.cd/.test(host),image_url:image,_type:"live"};
      }).filter(Boolean).slice(0,30);
      localStorage.setItem(newsCacheKey,JSON.stringify({time:Date.now(),items:liveExamNews}));
      $("#news-feed-status").textContent="Flux actualisé · "+new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})+" · sources externes à vérifier";
    }catch(error){
      console.warn("Flux EXETAT:",error);
      $("#news-feed-status").textContent=liveExamNews.length?"Flux en cache · connexion au fil en attente":"Fil institutionnel enregistré · flux en direct temporairement indisponible";
    }
  }
  function renderExamNews(items){
    const root=$("#news-feed");if(!root)return;
    const filter=activeNewsFilter;
    const filtered=items.filter(item=>{
      const d=new Date(item.published_on||item._date||0);
      if(filter==="archives")return d.getFullYear()<new Date().getFullYear()||d.getMonth()<new Date().getMonth()&&d.getFullYear()===new Date().getFullYear();
      if(filter==="tout")return true;
      if(filter==="diplomes")return item.category==="diplomes"||item.category==="diplome";
      if(filter==="calendrier")return item.category==="calendrier";
      if(filter==="exetat")return ["exetat","examen","resultats","epreuves","inscriptions"].includes(item.category);
      if(["resultats","epreuves","inscriptions"].includes(filter))return item.category===filter;
      return false;
    }).sort((a,b)=>new Date(b.published_on||b._date||0)-new Date(a.published_on||a._date||0));
    root.replaceChildren();
    if(!filtered.length){root.innerHTML='<div class="empty-state"><strong>Aucune publication dans cette catégorie.</strong><span>Actualise le fil ou consulte les communiqués du ministère.</span></div>';return;}
    filtered.forEach((item,index)=>{
      const card=document.createElement("article");card.className=index===0?"news-feed-card news-feed-featured":"news-feed-card";
      const image=document.createElement("img");image.className="news-feed-image";image.loading="lazy";image.src=item.image_url||"https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80";image.alt="Illustration d’actualité scolaire";image.onerror=()=>{image.src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80";};
      const body=document.createElement("div");body.className="news-feed-content";
      const meta=document.createElement("div");meta.className="news-feed-meta";
      const tag=document.createElement("span");tag.className="news-category";tag.textContent=item.is_official?"SOURCE OFFICIELLE":item._type==="live"?"FIL D’ACTUALITÉ":"ARCHIVE MINISTÉRIELLE";
      const date=document.createElement("time");date.textContent=newsDate(item.published_on||item._date);
      meta.append(tag,date);
      const title=document.createElement("h3");title.textContent=item.title;
      const summary=document.createElement("p");summary.textContent=item.summary||item.body||"Consulte la publication originale pour les détails.";
      body.append(meta,title,summary);
      const footer=document.createElement("div");footer.className="news-feed-footer";
      const source=document.createElement("span");source.textContent=item.source_name||"MINEDU-NC";
      const link=document.createElement("a");link.href=item.source_url||"#";link.target="_blank";link.rel="noopener";link.textContent="Lire la suite ↗";
      footer.append(source,link);body.append(footer);
      card.append(image,body);root.append(card);
    });
  }
  async function loadNews(force=false){
    const root=$("#news-feed");if(!root)return;
    const [newsRes,annRes]=await Promise.all([
      supa.from("news_items").select("category,title,summary,source_name,source_url,published_on,last_verified_on,is_official,image_url").eq("status","publie").order("published_on",{ascending:false}).limit(50),
      supa.from("announcements").select("title,body,importance,pinned,published_at,expires_at").order("published_at",{ascending:false}).limit(20)
    ]);
    if(newsRes.error)console.warn("Actualités NACRE:",newsRes.error);
    if(annRes.error)console.warn("Annonces NACRE:",annRes.error);
    const official=(newsRes.data||[]).map(n=>({...n,_date:n.published_on}));
    const live=liveExamNews.map(n=>({...n}));
    const announcements=(annRes.data||[]).filter(a=>!a.expires_at||new Date(a.expires_at)>new Date()).map(a=>({...a,category:"classe",source_name:"SCIENCE 4 · Institut de la Gombe 2",published_on:a.published_at,summary:a.body,source_url:null,is_official:false}));
    renderExamNews([...official,...live,...announcements]);
    if(force)$("#news-feed-status").textContent="Actualisation du fil en cours…";
  }

  async function publishAssignment(form){
    if(!staff()){say("Accès professeur non autorisé.");return;}
    const subjectId=$("#assignment-subject").value;
    const title=$("#assignment-title").value.trim(), instructions=$("#assignment-description").value.trim();
    const date=$("#assignment-due").value;
    const {error}=await supa.from("assignments").insert({
      subject_id:subjectId,title,instructions,kind:"devoir",points:20,
      due_at:date?new Date(date+"T23:59:00").toISOString():null,status:"publie"
    });
    if(error){console.error(error);say("Le devoir n’a pas été publié. Vérifie la matière et les droits.");return;}
    form.reset();say("Devoir publié à la classe.");await loadAssignments();
  }

  async function publishCourse(form){
    if(!staff()){say("Dépôt réservé aux professeurs validés.");return;}
    const file=$("#resource-file").files[0];
    const month=$("#resource-month").value;
    if(!month){say("Choisis le mois du cours.");return;}
    if(!file||file.type!=="application/pdf"){say("Choisis un fichier PDF valide.");return;}
    if(file.size>25*1024*1024){say("Le PDF doit faire moins de 25 Mo.");return;}
    const {data:course,error}=await supa.from("courses").insert({
      subject_id:$("#resource-subject").value,title:$("#resource-title").value.trim(),
      description:$("#resource-chapter").value.trim()||null,course_month:month+"-01",kind:"cours",status:"publie"
    }).select("id").single();
    if(error){console.error(error);say("Impossible de créer le cours.");return;}
    const safe=file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g,"-");
    const path=profile.id+"/"+course.id+"/"+Date.now()+"-"+safe;
    const {error:uploadError}=await supa.storage.from("documents").upload(path,file,{contentType:"application/pdf",upsert:false});
    if(uploadError){await supa.from("courses").delete().eq("id",course.id);console.error(uploadError);say("Le PDF n’a pas pu être déposé.");return;}
    const {error:docError}=await supa.from("course_documents").insert({
      course_id:course.id,kind:"pdf",role:"principal",bucket:"documents",storage_path:path,file_name:file.name,mime_type:"application/pdf",size_bytes:file.size
    });
    if(docError){console.error(docError);say("Le fichier est déposé, mais son indexation a échoué.");return;}
    form.reset();say("Cours PDF publié dans la bibliothèque.");await loadCourses();
  }

  async function publishAnnouncement(form){
    if(!staff()){say("Seuls les comptes enseignants validés peuvent publier.");return;}
    const {error}=await supa.from("announcements").insert({
      title:$("#announcement-title").value.trim(),body:$("#announcement-body").value.trim(),
      importance:"normale",pinned:false
    });
    if(error){console.error(error);say("Annonce non publiée.");return;}
    form.reset();say("Annonce publiée dans Actualités RDC.");await loadNews();
  }

  async function createTeacherInvite(form){
    if(!admin()){say("Action réservée à l’administrateur.");return;}
    const uses=Math.max(1,Math.min(50,Number(form.elements.uses.value)||1));
    const days=Math.max(1,Math.min(365,Number(form.elements.days.value)||30));
    const {data,error}=await supa.rpc("admin_create_invite",{p_role:"professeur",p_label:"Invitation professeur SCIENCE 4",p_max_uses:uses,p_days:days});
    if(error){console.error(error);say("Création du code impossible.");return;}
    $("#teacher-invite-result").hidden=false;$("#teacher-invite-result code").textContent=data;
    say("Code professeur créé. Copie-le et remets-le uniquement à l’enseignant concerné.");
  }

  async function saveTeacherFeedback(form){
    if(!staff())return;
    const body=form.elements.body.value.trim();if(!body)return;
    const {error}=await supa.from("submission_comments").insert({submission_id:form.dataset.submission,body});
    if(error){console.error(error);say("Retour non envoyé.");return;}
    form.reset();say("Retour privé envoyé à l’élève.");await loadTeacherSubmissions();
  }

  async function boot(){
    window.loadAssignments=loadAssignments;
    if(!window.supabase||!window.SCIENCE4_SUPABASE_URL||!window.SCIENCE4_SUPABASE_PUBLISHABLE_KEY){
      $("#teacher-access-title").textContent="Connexion NACRE indisponible";
      $("#teacher-access-text").textContent="Vérifie la configuration Supabase du campus.";
      return;
    }
    try{
      if(!supa)supa=window.supabase.createClient(window.SCIENCE4_SUPABASE_URL,window.SCIENCE4_SUPABASE_PUBLISHABLE_KEY);
      let {data:{session}}=await supa.auth.getSession();
      if(!session){const sign=await supa.auth.signInAnonymously();if(sign.error)throw sign.error;session=sign.data.session;}
      currentUser=session?.user||null;
      if(!currentUser)throw new Error("Session anonyme absente");
      const registered=await getContext();
      await loadSubjects();
      if(registered){await Promise.all([loadCourses(),loadAssignments()]);await fetchLiveExamNews(false);await loadNews();if(staff())await loadTeacherSubmissions();}
      supa.channel("science4-nacre-updates")
        .on("postgres_changes",{event:"*",schema:"public",table:"assignments"},()=>loadAssignments())
        .on("postgres_changes",{event:"*",schema:"public",table:"assignment_submissions"},()=>{loadAssignments();if(staff())loadTeacherSubmissions();})
        .on("postgres_changes",{event:"*",schema:"public",table:"announcements"},loadNews)
        .on("postgres_changes",{event:"*",schema:"public",table:"news_items"},loadNews)
        .on("postgres_changes",{event:"*",schema:"public",table:"submission_comments"},()=>loadAssignments())
        .subscribe();
      $("#chat-status").textContent="Campus connecté";
    }catch(error){
      console.error("NACRE:",error);
      $("#teacher-access-title").textContent="Connexion à NACRE impossible";
      $("#teacher-access-text").textContent="La connexion anonyme doit être activée dans Supabase. Recharge ensuite SCIENCE 4.";
    }
  }

  const profileForm=$("#profile-form");
  profileForm?.addEventListener("submit",async e=>{
    e.preventDefault();e.stopImmediatePropagation();
    if(!supa||!currentUser){say("Connexion à NACRE indisponible.");return;}
    if(profile){say("Ce compte possède déjà un profil.");return;}
    const nom=$("#profile-last").value.trim(),postnom=$("#profile-middle").value.trim(),prenom=$("#profile-first").value.trim();
    const kind=$("#profile-kind")?.value||"eleve";
    const code=$("#teacher-invite-code")?.value.trim()||"";
    if(kind==="professeur"&&!code){say("Un code d’invitation professeur est obligatoire.");return;}
    const rpc=kind==="professeur"?"register_teacher":"register_student";
    const args=kind==="professeur"?{p_nom:nom,p_postnom:postnom,p_prenom:prenom,p_code:code,p_label:deviceLabel()}:{p_nom:nom,p_postnom:postnom,p_prenom:prenom,p_label:deviceLabel()};
    const {data,error}=await supa.rpc(rpc,args);
    if(error){console.error(error);say("Inscription impossible. Vérifie les informations et le code.");return;}
    if(!data?.ok){const messages={CODE_INVALIDE:"Code invalide ou expiré.",NOM_EXISTANT:"Ce nom est déjà enregistré.",NOM_INVALIDE:"Vérifie les noms saisis.",DEJA_INSCRIT:"Ce téléphone possède déjà un profil."};say(messages[data?.error]||"Inscription refusée.");return;}
    await getContext();
    await Promise.all([loadSubjects(),loadCourses(),loadAssignments()]);await fetchLiveExamNews(false);await loadNews();
    say(data.role==="admin"?"Compte administrateur activé.":"Inscription terminée. Bienvenue dans SCIENCE 4.");
  },true);

  $("#news-filters")?.addEventListener("click",e=>{const b=e.target.closest("[data-filter]");if(!b)return;activeNewsFilter=b.dataset.filter;$("#news-filters").querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));loadNews();});
  $("#news-refresh")?.addEventListener("click",async()=>{await fetchLiveExamNews(true);await loadNews();});
  setInterval(async()=>{if(document.hidden||!navigator.onLine)return;await fetchLiveExamNews(true);await loadNews();},30*60*1000);
  const monthInput=$("#resource-month");if(monthInput)monthInput.value=new Date().toISOString().slice(0,7);
  $("#profile-kind")?.addEventListener("change",e=>{
    const teacher=e.target.value==="professeur";
    $("#teacher-code-wrap").hidden=!teacher;
    $("#profile-submit").textContent=teacher?"Créer mon compte enseignant":"Créer mon profil de classe";
  });
  $("#assignment-form")?.addEventListener("submit",async e=>{e.preventDefault();e.stopImmediatePropagation();await publishAssignment(e.currentTarget);},true);
  $("#resource-upload-form")?.addEventListener("submit",async e=>{e.preventDefault();e.stopImmediatePropagation();await publishCourse(e.currentTarget);},true);
  $("#announcement-form")?.addEventListener("submit",async e=>{e.preventDefault();e.stopImmediatePropagation();await publishAnnouncement(e.currentTarget);},true);
  $("#assignment-list")?.addEventListener("submit",async e=>{const f=e.target.closest(".student-submission-form");if(!f)return;e.preventDefault();e.stopImmediatePropagation();await submitAssignment(f);},true);
  $("#teacher-submissions")?.addEventListener("submit",async e=>{const f=e.target.closest(".teacher-feedback-form");if(!f)return;e.preventDefault();e.stopImmediatePropagation();await saveTeacherFeedback(f);},true);
  $("#teacher-invite-form")?.addEventListener("submit",async e=>{e.preventDefault();e.stopImmediatePropagation();await createTeacherInvite(e.currentTarget);},true);
  $("#teacher-invite-copy")?.addEventListener("click",async()=>{const code=$("#teacher-invite-result code")?.textContent||"";if(!code)return;try{await navigator.clipboard.writeText(code);say("Code copié.");}catch{say("Sélectionne le code pour le copier.");}});
  document.addEventListener("click",e=>{
    const nav=e.target.closest('[data-view="professeur"]');
    if(nav&&!staff()){e.preventDefault();e.stopImmediatePropagation();say("Espace réservé aux enseignants validés.");if(typeof showView==="function")showView("profil");}
  },true);
  $$(".filter-pill").forEach(b=>b.addEventListener("click",()=>{setTimeout(loadAssignments,0)}));
  boot();
})();