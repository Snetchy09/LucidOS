function isImageIcon(value){return /^(data:image\/(png|jpeg|webp|gif);base64,|https?:\/\/)/i.test(String(value||""))}
function upgrade(root){root.querySelectorAll(".store-app-icon,.store-detail-icon,.desktop-app-icon").forEach(node=>{if(node.dataset.iconFixed)return;const value=node.textContent.trim();if(!isImageIcon(value))return;node.dataset.iconFixed="1";node.textContent="";const image=document.createElement("img");image.src=value;image.alt="";image.loading="lazy";node.appendChild(image)});}
const observer=new MutationObserver(()=>upgrade(document));
observer.observe(document.body,{childList:true,subtree:true});
window.addEventListener("load",()=>upgrade(document));