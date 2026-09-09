import { getCurrentUser, getOwnSubmissions } from "./lucid-store-api.js";
const KEY="lucid-review-notification-state";
let timer=null;
function notify(message){let box=document.querySelector(".lucid-script-notifications");if(!box){box=document.createElement("div");box.className="lucid-script-notifications";document.body.appendChild(box)}const item=document.createElement("div");item.className="lucid-script-notification";item.textContent=message;box.appendChild(item);setTimeout(()=>item.remove(),4500)}
function state(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}}
function save(value){localStorage.setItem(KEY,JSON.stringify(value));}
async function check(){const user=await getCurrentUser();if(!user)return;try{const submissions=await getOwnSubmissions();const seen=state();for(const item of submissions){if(!item.id)continue;const status=item.status||"pending";const previous=seen[item.id];if(previous&&previous!==status){if(status==="approved")notify(`Lucid Store approved “${item.name}”.`);else if(status==="rejected")notify(`Lucid Store rejected “${item.name}”.${item.rejection_reason?` ${item.rejection_reason}`:""}`);}seen[item.id]=status;}save(seen);}catch(error){console.warn("Lucid review notifications:",error)}}
function start(){clearInterval(timer);check();timer=setInterval(check,30000)}
window.addEventListener("lucid-app-installed",()=>{});
window.addEventListener("load",()=>start());
export { start };