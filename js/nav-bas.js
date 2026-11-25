/* SCIENCE 4 — Navigation basse adaptée aux vues réelles de index.html. */
(function(){
"use strict";
var PRINCIPAUX=[
{id:"view-accueil",nom:"Accueil",ic:"🏠",vue:"accueil"},
{id:"view-cours",nom:"Cours",ic:"📚",vue:"cours"},
{id:"view-sos",nom:"Entraide",ic:"🤝",vue:"sos"},
{id:"view-actualites",nom:"Actualités",ic:"📰",vue:"actualites"},
{id:"view-profil",nom:"Moi",ic:"👤",vue:"profil"}
];
var PLUS=[
{id:"view-exetat",nom:"Prépa EXETAT",ic:"🎓",vue:"exetat"},
{id:"view-devoirs",nom:"Devoirs & travaux",ic:"📝",vue:"devoirs"},
{id:"view-discussions",nom:"La salle commune",ic:"💬",vue:"discussions"},
{id:"view-defis",nom:"Défis scientifiques",ic:"🧪",vue:"defis"},
{id:"view-orientation",nom:"Après le secondaire",ic:"🚀",vue:"orientation"},
{id:"view-professeur",nom:"Espace professeur",ic:"🧑‍🏫",vue:"professeur"}
];
function marquer(id){document.querySelectorAll("#s4-nav [data-id]").forEach(function(b){b.classList.toggle("on",b.dataset.id===id)});}
function fermer(){var p=document.getElementById("s4-plus");if(p)p.classList.remove("ouvert");}
function aller(o){if(!document.getElementById(o.id))return;if(typeof window.showView==="function")window.showView(o.vue);else{document.querySelectorAll(".view").forEach(function(v){v.classList.toggle("active",v.id===o.id)});history.replaceState(null,"","#"+o.vue);}marquer(o.id);fermer();}
function bouton(o){return '<button type="button" data-id="'+o.id+'"><span>'+o.ic+'</span><small>'+o.nom+'</small></button>';}
function monter(){if(document.getElementById("s4-nav"))return;
var nav=document.createElement("nav");nav.id="s4-nav";nav.setAttribute("aria-label","Navigation principale");
nav.innerHTML=PRINCIPAUX.map(bouton).join("")+'<button type="button" data-plus="1"><span>⋯</span><small>Plus</small></button>';
var plus=document.createElement("div");plus.id="s4-plus";plus.innerHTML='<div class="s4-feuille"><i></i>'+PLUS.map(bouton).join("")+'</div>';
document.body.appendChild(plus);document.body.appendChild(nav);document.body.classList.add("s4-avec-nav");
document.addEventListener("click",function(e){var b=e.target.closest("#s4-nav [data-id],#s4-plus [data-id],#s4-nav [data-plus]");if(!b){if(e.target===plus)fermer();return;}if(b.hasAttribute("data-plus")){plus.classList.toggle("ouvert");return;}var o=PRINCIPAUX.concat(PLUS).find(function(x){return x.id===b.dataset.id});if(o)aller(o);});
var active=document.querySelector(".view.active");var item=PRINCIPAUX.concat(PLUS).find(function(o){return active&&o.vue===active.id.replace("view-","")});if(item)marquer(item.id);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",monter);else monter();
})();
