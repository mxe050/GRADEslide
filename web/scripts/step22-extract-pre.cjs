const fs = require("fs");
const PRE = "C:/Users/yuasa/AppData/Local/Temp/pre-step15.json";
const OUT = "C:/Users/yuasa/AppData/Local/Temp/pre-step15-targets.json";
const d = JSON.parse(fs.readFileSync(PRE, "utf8"));
const targetIds = [
  "S47","S48","S49","S50","S51","S52","S53","S54","S55","S56","S57","S58","S59",
  "S60","S61","S62","S63","S64","S65","S66","S67","S68","S69","S70","S71","S72",
  "S74","S75","S76","S78","S80","S81","S82","S83","S84","S85","S87","S91",
];
const out = {};
for (const id of targetIds) {
  const s = d.slides.find((x) => x.id === id);
  if (!s) continue;
  out[id] = { type: s.visual.type, title: s.title, data: s.visual.data };
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log("Saved targets:", Object.keys(out).length);
console.log("Types:", Object.entries(out).map(([k,v]) => k + "=" + v.type).join(", "));
