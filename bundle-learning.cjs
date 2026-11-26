const fs=require('node:fs'),vm=require('node:vm');
let html=fs.readFileSync('index.html','utf8');
const modules=[['learning-content.js','/* Reviewed lesson packs'],['review-study.js','/* 塾の復習。'],['lesson-packs.js','window.RihokoLessonPacks ='],['review-packs.json','window.ReviewPacks='],['japan-quest.js',"var KEY='rihoko-japan-quest-v1'"]];
for(const [file,marker] of modules){let found=0;html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,block=>{if(!block.includes(marker))return block;found++;let body=fs.readFileSync(file,'utf8');if(file.endsWith('.json'))body='window.ReviewPacks='+body+';';return '<script>\n'+body+'\n</script>';});if(found!==1)throw Error(file+' found '+found);}
if(!html.includes('id="adaptive-lessons-v1"'))html=html.replace('<script>\n/* Reviewed lesson packs','<script id="adaptive-lessons-v1">\n'+fs.readFileSync('adaptive-lessons.js','utf8')+'\n</script>\n<script>\n/* Reviewed lesson packs');
else html=html.replace(/<script id="adaptive-lessons-v1">[\s\S]*?<\/script>/,'<script id="adaptive-lessons-v1">\n'+fs.readFileSync('adaptive-lessons.js','utf8')+'\n</script>');
// Bump this version for each published app update. Both visible labels use it.
const appVersion='2026.11.26.6';
html=html.replace(/var APP_VERSION = "[^"]+"/,'var APP_VERSION = "'+appVersion+'"');
html=html.replace(/(<span id="appVersion" class="app-version">)[^<]+/,'$1v'+appVersion);
for(const [id,file,tag] of [['weekly-curriculum-v2','weekly-curriculum.js','script'],['display-settings','display-settings.js','script'],['dark-theme','dark-theme.css','style'],['science-guides','science-guides.js','script'],['social-guides','social-guides.js','script'],['learning-experience','learning-experience.js','script'],['learning-experience-style','learning-experience.css','style'],['continuing-learning','continuing-learning.js','script'],['continuing-learning-style','continuing-learning.css','style'],['problem-metadata','problem-metadata.js','script'],['problem-metadata-style','problem-metadata.css','style'],['detective-guide','detective-guide.js','script']]){
  const block='<'+tag+' id="'+id+'">\n'+fs.readFileSync(file,'utf8')+'\n</'+tag+'>';
  const re=new RegExp('<'+tag+' id="'+id+'">[\\s\\S]*?</'+tag+'>');
  html=re.test(html)?html.replace(re,()=>block):html.replace('</head>',()=>block+'\n</head>');
}
if(!html.includes('id="choice-learning-style"'))html=html.replace('</head>','<style id="choice-learning-style">.lc-choices{display:grid;grid-template-columns:1fr;gap:10px}.lc-choices button{min-height:52px;text-align:left;padding:14px;font-size:1rem;line-height:1.6;white-space:normal;overflow-wrap:anywhere}.lc-choices button[aria-pressed="true"]{background:#d9eee8;border:2px solid #25796e;color:#163e38}.lc-past{margin:24px 0}.lc-past summary{font-size:1.05rem;font-weight:bold;padding:14px;cursor:pointer}.rs-list details>summary{padding:14px}.rs-question p,.rs-question blockquote{white-space:pre-wrap}.rs-question fieldset button{margin:4px;min-height:44px}</style>\n</head>');
let detectiveStyles=0;html=html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,block=>{if(!block.includes('.learning-content{background-color:#faf7ee'))return block;detectiveStyles++;return '<style>'+fs.readFileSync('detective-theme.css','utf8')+'</style>';});if(detectiveStyles!==1)throw Error('Detective theme block missing or duplicate');
for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
fs.writeFileSync('index.html',html);console.log('Bundled and parsed all inline scripts.');
