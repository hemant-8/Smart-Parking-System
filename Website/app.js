var firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
firebase.initializeApp(firebaseConfig);
var db = firebase.database();

function sortedSlotKeys(slots){
  if(!slots) return [];
  return Object.keys(slots).map(n=>Number(n)).sort((a,b)=>a-b);
}
function money(v){ return "₹" + Number(v||0).toFixed(2); }

var revChart = null;

if(document.getElementById("totalSlots")){
  
  db.ref("slots").on("value", snap=>{
    var s = snap.val() || {};
    var keys = sortedSlotKeys(s);
    var total = keys.length;
    var free = keys.filter(k=>s[k]==="EMPTY").length;
    document.getElementById("totalSlots").innerText = total;
    document.getElementById("freeSlots").innerText = free;
    document.getElementById("occupiedSlots").innerText = total - free;
  });

  db.ref("active_parking").on("value", snap=>{
    var list = snap.val() || {};
    var out = "";
    Object.keys(list).forEach(p=>{
      var r = list[p];
      out += `<tr><td>${p}</td><td>${r.slot}</td><td>${r.entry_time}</td><td>${r.payment_method}</td></tr>`;
    });
    document.getElementById("currentList").innerHTML = out;
  });

  db.ref("parking_history").on("value", snap=>{
    var hist = snap.val() || {};

    db.ref("entry_revenue").once("value").then(esnap=>{
      var entryData = esnap.val() || {};

      var todayKey = new Date().toISOString().slice(0,10);
      var total=0, today=0;

      var days={};
      for(var i=6;i>=0;i--){
        var d=new Date();
        d.setDate(d.getDate()-i);
        days[d.toISOString().slice(0,10)] = 0;
      }

      Object.values(hist).forEach(r=>{
        total += r.fee||0;
        if((r.exit_time||"").startsWith(todayKey)) today += r.fee||0;

        var dk=(r.exit_time||"").slice(0,10);
        if(days[dk]!==undefined) days[dk] += r.fee||0;
      });

      Object.keys(entryData).forEach(day=>{
        Object.values(entryData[day]).forEach(v=>{
          total += v;
          if(day===todayKey) today += v;
          if(days[day]!==undefined) days[day]+=v;
        });
      });

      document.getElementById("revenueTotal").innerText = money(total);
      document.getElementById("revenueToday").innerText = money(today);

      var ctx = document.getElementById("revChart").getContext("2d");
      if(revChart) revChart.destroy();

      revChart = new Chart(ctx,{
        type:"line",
        data:{
          labels:Object.keys(days),
          datasets:[{
            label:"Revenue",
            data:Object.values(days),
            borderColor:"#00eaff",
            backgroundColor:"rgba(0,234,255,0.1)",
            fill:true,
            tension:0.25
          }]
        },
        options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}
      });
    });
  });
}

if(document.getElementById("slotContainer")){
  db.ref("slots").on("value", snap=>{
    var s=snap.val()||{};
    var keys=sortedSlotKeys(s);
    var html="";
    keys.forEach(k=>{
      var v=s[k];
      var cls=v==="EMPTY"?"slot empty":"slot filled";
      html+=`<div class="${cls}">Slot ${k}<br>${v}</div>`;
    });
    document.getElementById("slotContainer").innerHTML=html;
  });
}

if(document.getElementById("pendingContainer")){
  db.ref("pending_entries").on("value", snap=>{
    var p=snap.val()||{};
    var html="";
    Object.keys(p).forEach(key=>{
      var d=p[key];
      var plate=d.plate;
      html+=`
        <div class="pending-card">
          <h4>Entry Request</h4>
          <div class="plate">${plate}</div>
          <div class="pm-row">
            <label><input type="radio" name="pm-${plate}" value="Cash" checked> Cash</label>
            <label><input type="radio" name="pm-${plate}" value="UPI"> UPI</label>
            <label><input type="radio" name="pm-${plate}" value="Card"> Card</label>
          </div>
          <button onclick="approve('${plate}','${key}')" class="hx-btn blue">Approve</button>
          <button onclick="rejectReq('${key}')" class="hx-btn red">Reject</button>
        </div>
      `;
    });
    document.getElementById("pendingContainer").innerHTML=html;
  });
}

function approve(plate,key){
  var pm="Cash";
  var r=document.getElementsByName("pm-"+plate);
  for(var i=0;i<r.length;i++) if(r[i].checked){ pm=r[i].value; break; }

  db.ref("slots").once("value",snap=>{
    var s=snap.val()||{};
    var keys=sortedSlotKeys(s);
    var free=null;
    for(var i=0;i<keys.length;i++){ if(s[keys[i]]==="EMPTY"){ free=keys[i]; break; } }
    if(!free){ alert("Parking Full"); return; }

    var t=new Date().toISOString();
    var day=t.slice(0,10);

    db.ref("entry_revenue/"+day+"/"+plate).set(50);

    db.ref("active_parking/"+plate).set({
      slot:free,
      entry_time:t,
      payment_method:pm,
      initial_fee:50
    });

    db.ref("slots/"+free).set(plate);
    db.ref("pending_entries/"+key).remove();
  });
}

function rejectReq(key){ db.ref("pending_entries/"+key).remove(); }

if(document.getElementById("historyTable")){
  db.ref("parking_history").on("value", snap=>{
    var d=snap.val()||{};
    var html="";
    Object.keys(d).forEach(id=>{
      var r=d[id];
      html+=`
      <tr>
        <td>${r.plate}</td>
        <td>${r.slot}</td>
        <td>${r.entry_time}</td>
        <td>${r.exit_time}</td>
        <td>${(r.duration_hours||0).toFixed(2)}</td>
        <td>${money(r.fee)}</td>
        <td>${r.payment_method}</td>
        <td><button class="hx-btn blue" onclick="downloadReceipt('${id}')">PDF</button></td>
      </tr>`;
    });
    document.getElementById("historyTable").innerHTML=html;
  });
}

function downloadReceipt(id){
  db.ref("parking_history/"+id).once("value", snap=>{
    var r=snap.val();
    const {jsPDF}=window.jspdf;
    var doc=new jsPDF();
    doc.setFont("Courier","normal");
    doc.setFontSize(18);
    doc.text("SMART PARKING RECEIPT",20,20);
    doc.setFontSize(12);
    var y=45;
    var rows=[
      ["Plate",r.plate],
      ["Slot",r.slot],
      ["Entry",r.entry_time],
      ["Exit",r.exit_time],
      ["Hours",(r.duration_hours||0).toFixed(2)],
      ["Fee","₹"+r.fee],
      ["Payment",r.payment_method]
    ];
    rows.forEach(v=>{
      doc.text(v[0]+": "+v[1],20,y);
      y+=16;
    });
    doc.save(`receipt_${r.plate}_${id}.pdf`);
  });
}
