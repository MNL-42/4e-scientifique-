/* SCIENCE 4 — Navigation basse, icônes vectorielles sobres. */
(function(){
"use strict";
var PRINCIPAUX=[
{id:"view-accueil",nom:"Accueil",ic:"home",vue:"accueil"},
{id:"view-cours",nom:"Cours",ic:"book",vue:"cours"},
{id:"view-sos",nom:"Entraide",ic:"message",vue:"sos"},
{id:"view-actualites",nom:"Actualités",ic:"news",vue:"actualites"},
{id:"view-profil",nom:"Moi",ic:"user",vue:"profil"}
];
var PLUS=[
{id:"view-exetat",nom:"Prépa EXETAT",ic:"cap",vue:"exetat"},
{id:"view-devoirs",nom:"Devoirs & travaux",ic:"file",vue:"devoirs"},
{id:"view-discussions",nom:"La salle commune",ic:"chat",vue:"discussions"},
{id:"view-defis",nom:"Défis scientifiques",ic:"lab",vue:"defis"},
{id:"view-orientation",nom:"Après le secondaire",ic:"compass",vue:"orientation"},
{id:"view-professeur",nom:"Espace professeur",ic:"teacher",vue:"professeur"}
];
var PATHS={
home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 10h8"/>',
message:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
news:'<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c.5-4 3.2-6 8-6s7.5 2 8 6"/>',
cap:'<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c4 3 8 3 12 0v-5M22 9v6"/>',
file:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 12h7M9 16h7"/>',
chat:'<path d="M4 5h16v12H9l-5 4z"/><path d="M8 9h8M8 13h5"/>',
lab:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M8 15h8"/>',
compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
teacher:'<circle cx="9" cy="8" r="3"/><path d="M3 20c.5-3.5 2.5-5 6-5s5.5 1.5 6 5M16 5h5M18.5 3v4"/>'
};
function svg(name){return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(PATHS[name]||PATHS.file)+'</svg>';}
function marquer(id){document.querySelectorAll("#s4-nav [data-id]").forEach(function(b){b.classList.toggle("on",b.dataset.id===id)});}
function fermer(){var p=document.getElementById("s4-plus");if(p)p.classList.remove("ouvert");}
function aller(o){if(!document.getElementById(o.id))return;if(typeof window.showView==="function")window.showView(o.vue);else{document.querySelectorAll(".view").forEach(function(v){v.classList.toggle("active",v.id===o.id)});history.replaceState(null,"","#"+o.vue);}marquer(o.id);fermer();}
function bouton(o){return '<button type="button" data-id="'+o.id+'"><span class="s4-nav-icon">'+svg(o.ic)+'</span><small>'+o.nom+'</small></button>';}
function monter(){if(document.getElementById("s4-nav"))return;
var nav=document.createElement("nav");nav.id="s4-nav";nav.setAttribute("aria-label","Navigation principale");
nav.innerHTML=PRINCIPAUX.map(bouton).join("")+'<button type="button" data-plus="1"><span class="s4-nav-icon s4-more">•••</span><small>Plus</small></button>';
var plus=document.createElement("div");plus.id="s4-plus";plus.innerHTML='<div class="s4-feuille"><i></i>'+PLUS.map(bouton).join("")+'</div>';
document.body.appendChild(plus);document.body.appendChild(nav);document.body.classList.add("s4-avec-nav");
document.addEventListener("click",function(e){var b=e.target.closest("#s4-nav [data-id],#s4-plus [data-id],#s4-nav [data-plus]");if(!b){if(e.target===plus)fermer();return;}if(b.hasAttribute("data-plus")){plus.classList.toggle("ouvert");return;}var o=PRINCIPAUX.concat(PLUS).find(function(x){return x.id===b.dataset.id});if(o)aller(o);});
var active=document.querySelector(".view.active");var item=PRINCIPAUX.concat(PLUS).find(function(o){return active&&o.vue===active.id.replace("view-","")});if(item)marquer(item.id);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",monter);else monter();
})();
