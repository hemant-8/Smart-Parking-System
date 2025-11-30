import cv2, requests, json, time, math
from datetime import datetime

BASE = "Firebase URL"
SECRET = "Firebase Secret"
XML = "/home/hemant/hemant/indian_plate.xml"
OCR = "http://192.168.31.199:5000/ocr"

cascade = cv2.CascadeClassifier(XML)
if cascade.empty(): exit()

cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M','J','P','G'))
cap.set(3, 640)
cap.set(4, 480)

def get(p):
    try: return requests.get(f"{BASE}/{p}.json?auth={SECRET}").json()
    except: return None

def put(p,d): return requests.put(f"{BASE}/{p}.json?auth={SECRET}",data=json.dumps(d))
def post(p,d): return requests.post(f"{BASE}/{p}.json?auth={SECRET}",data=json.dumps(d))
def delete(p): return requests.delete(f"{BASE}/{p}.json?auth={SECRET}")

def ocr_plate(img):
    ok,buf=cv2.imencode(".jpg",img)
    if not ok: return ""
    try:
        r=requests.post(OCR,files={"image":buf.tobytes()}, timeout=5)
        return r.json().get("plate","")
    except:
        return ""

def fee(hours):
    if hours <= 1: return 50
    return 50 + (math.ceil(hours - 1) * 50)

def free_slot(p):
    d=get(f"active_parking/{p}")
    if not d: return
    put(f"slots/{d['slot']}","EMPTY")
    delete(f"active_parking/{p}")

def exit_car(p):
    d=get(f"active_parking/{p}")
    if not d: return
    ts=d.get("entry_time","").replace("Z","")
    try: e=datetime.fromisoformat(ts)
    except: e=datetime.strptime(ts.split(".")[0],"%Y-%m-%dT%H:%M:%S")
    ex=datetime.now()
    hrs=(ex-e).total_seconds()/3600
    f=fee(hrs)
    pm=d.get("payment_method","Cash")
    post("parking_history",{
        "plate":p,
        "slot":d["slot"],
        "entry_time":d.get("entry_time"),
        "exit_time":ex.isoformat(),
        "duration_hours":hrs,
        "fee":f,
        "payment_method":pm
    })
    free_slot(p)

last=0
cool=10
streak={}
MIN_STREAK=2

while True:
    ok,frame=cap.read()
    if not ok:
        time.sleep(0.05)
        continue

    gray=cv2.cvtColor(frame,cv2.COLOR_BGR2GRAY)
    plates=cascade.detectMultiScale(gray,1.1,4)

    for(x,y,w,h) in plates:
        crop=frame[y:y+h,x:x+w]
        p=ocr_plate(crop)

        if len(p)>=5:
            streak[p]=streak.get(p,0)+1

            if streak[p]>=MIN_STREAK and time.time()-last>=cool:
                act=get(f"active_parking/{p}")

                if act:
                    exit_car(p)
                    print("EXIT:",p)
                else:
                    post("pending_entries",{
                        "plate":p,
                        "time":datetime.now().isoformat()
                    })
                    print("ENTRY:",p)

                last=time.time()
                streak.clear()

        cv2.rectangle(frame,(x,y),(x+w,y+h),(0,255,0),2)

    cv2.imshow("ANPR",frame)
    if cv2.waitKey(1)&0xFF==27: break

cap.release()
cv2.destroyAllWindows()
