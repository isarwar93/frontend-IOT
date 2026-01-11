import React, { useEffect, useRef, useState } from "react";
import MedTopBar  from "./MedTopBar";
import FastLineCanvas from "./FastLineCanvas";
import BigInfos from "./BigInfos";
import { initChannels  } from "./MedWebSocket";
import { useDataStore } from "./useMedicalStore";


export const Medical: React.FC = () => {

  const containerRef = useRef<HTMLDivElement | null>(null);
  const channels = useDataStore((s) => s.channels);
  const dataRef = useRef<Float32Array[]>([]);
  const headRef = useRef<number[]>([]);
  const lenRef = useRef<number[]>([]);
  const maxValueRef = useRef<number[]>([]);
  const minValueRef = useRef<number[]>([]);
  const avgValueRef = useRef<number[]>([]);
  const [linesBp, setLinesBp] = useState<string[]>([]);
  const [linesBodyTemp, setLinesBodyTemp] = useState<string[]>([]);
  const containerRef2 = useRef<HTMLDivElement>(null);
  useEffect(() => {
    initChannels(["ecg", "heart_rate", "respiration_rate",
        "blood_pressure", "body_temperature"
    ], 1024);// buffer size 1024
  }, []);// run one time only

  useEffect(() => {
    console.log("channels updated:", channels);
    
    const allBuffers = channels.map(ch => ch.buffer);
    // console.log("buffers complete:", allBuffers);
    if (allBuffers.length === 0) return;
    // last two lines are for blood pressure and body temperature
    for (let s = 0; s < allBuffers.length-2; s++) {
      dataRef.current[s] = allBuffers[s];
      lenRef.current[s] = channels.map((ch => ch.buffer.length))[s];
      headRef.current[s] =  channels.map((ch => ch.head))[s];
      maxValueRef.current[s] = channels.map((ch => ch.max ?? 0))[s];
      maxValueRef.current[s] = Math.round(maxValueRef.current[s] );
      minValueRef.current[s] = channels.map((ch => ch.min ?? 0))[s];
      minValueRef.current[s] = Math.round(minValueRef.current[s] );
      avgValueRef.current[s] = channels.map((ch => ch.avg ?? 0))[s];
      avgValueRef.current[s] = Math.round(avgValueRef.current[s]);

      console.log("updated channels:", channels[s].name, channels[s].updated);
    }
    
    // for blood pressure
    const lastIndex = allBuffers.length-2;
    dataRef.current[lastIndex] = allBuffers[lastIndex];
    lenRef.current[lastIndex] = channels.map((ch => ch.buffer.length))[lastIndex];
    headRef.current[lastIndex] =  channels.map((ch => ch.head))[lastIndex];
    maxValueRef.current[lastIndex] = channels.map((ch => ch.max ?? 0))[lastIndex];
    maxValueRef.current[lastIndex] = Math.round(maxValueRef.current[lastIndex] * 10) / 10;
    minValueRef.current[lastIndex] = channels.map((ch => ch.min ?? 0))[lastIndex];
    minValueRef.current[lastIndex] = Math.round(minValueRef.current[lastIndex] * 10) / 10;
    avgValueRef.current[lastIndex] = channels.map((ch => ch.avg ?? 0))[lastIndex];
    avgValueRef.current[lastIndex] = Math.round(avgValueRef.current[lastIndex] * 10) / 10;
    // for body temperature
    const lastIndex2 = allBuffers.length-1;
    dataRef.current[lastIndex2] = allBuffers[lastIndex2];
    lenRef.current[lastIndex2] = channels.map((ch => ch.buffer.length))[lastIndex2];
    headRef.current[lastIndex2] =  channels.map((ch => ch.head))[lastIndex2];
    maxValueRef.current[lastIndex2] = channels.map((ch => ch.max ?? 0))[lastIndex2];
    maxValueRef.current[lastIndex2] = Math.round(maxValueRef.current[lastIndex2] * 10) / 10;
    minValueRef.current[lastIndex2] = channels.map((ch => ch.min ?? 0))[lastIndex2];
    minValueRef.current[lastIndex2] = Math.round(minValueRef.current[lastIndex2] * 10) / 10;
    avgValueRef.current[lastIndex2] = channels.map((ch => ch.avg ?? 0))[lastIndex2];
    avgValueRef.current[lastIndex2] = Math.round(avgValueRef.current[lastIndex2] * 10) / 10;

    // update log lines for blood pressure
    const bpIndex = allBuffers.length-2;
    const bpData = dataRef.current[bpIndex];
    const bpHead = headRef.current[bpIndex];
    const bpIdx = bpHead % bpData.length;
    const bpValue = bpData[bpIdx];

    // update log lines for body temperature
    const bodyTempIndex = allBuffers.length-1;
    const bodyTempData = dataRef.current[bodyTempIndex];
    const bodyTempHead = headRef.current[bodyTempIndex];
    const bodyTempIdx = bodyTempHead % bodyTempData.length;
    const bodyTempValue = bodyTempData[bodyTempIdx];

    // console.log("Blood Pressure Value:", bpValue);
    // console.log("Body Temperature Value:", bodyTempValue);

    // we want to show both blood pressure and body temperature in the log
    // if (containerRef2.current) {
    //   containerRef2.current.scrollTop = containerRef2.current.scrollHeight;
    // }
    const date = new Date();
    const showTime = date.getHours() 
    + ':' + date.getMinutes() 
    + ":" + date.getSeconds();
    setLinesBp(prev => {
      if (isNaN(bpValue)) {
        return prev;
      }
      const newLines = [...prev, ` ${showTime} -> Blood Pressure: ${bpValue.toFixed(1)} mmHg, `  ];
      // keep only last 20 lines
      return newLines.slice(-20);
    });
      
    setLinesBodyTemp(prev => {

      if (isNaN(bodyTempValue)) {
        return prev;
      }
      const newLines = [...prev, ` ${showTime} ->  Body Temp: ${bodyTempValue.toFixed(1)} °C`  ];
      // keep only last 20 lines
      return newLines.slice(-20);
    });

    channels.forEach(ch => ch.updated = false);
  }, [channels]);

 
 

  return (
    <div className="space-y-1">
      <MedTopBar />
      <div
       ref={containerRef}
       className={`rounded-t-md p-0 flex flex-wrap`}
       style={{ width: "100%", height: "540px" }}
      >
      <div
        className=" rounded-tl-md p-0 border border-b-0 border-r-0"
        style={{width:"70%",height:"400px"}}  
      >
      <FastLineCanvas  
        valuesList={[dataRef.current[0]]}
        currentHead={headRef.current[0]}
        xAxisDataPoints={lenRef.current[0]}
        numSeries={1}
        bufferCapacity={4096}
        lineColors={["#afa22bff"]}
        graphTitle="ECG"
      /> 
      <FastLineCanvas 
        valuesList={[dataRef.current[1]]}
        currentHead={headRef.current[1]}
        xAxisDataPoints={lenRef.current[1]}
        numSeries={1}
        bufferCapacity={4096}
        lineColors={["#2faf2bff"]}
        graphTitle="Pulse"
      />

      <FastLineCanvas 
        valuesList={[dataRef.current[2]]}
        currentHead={headRef.current[2]}
        xAxisDataPoints={lenRef.current[2]}
        numSeries={1}
        bufferCapacity={4096}
        lineColors={["#ca4821ff"]}
        graphTitle="Resp"
      />
      </div> 
      <div
        className="rounded-tr-md border border-b-0"
        style={{width:"30%",height:"400px"}}  
      >
        <BigInfos
          Colors={["#c9c621ff"]}
          Title1="MAX"
          Unit1="mV"
          Value1={maxValueRef.current[0] !== undefined ? maxValueRef.current[0].toString() : "0"}
          Title2="MIN"
          Unit2="mV"
          Value2={minValueRef.current[0] !== undefined ? minValueRef.current[0].toString() : "0"}
          Title3="AVG"
          Unit3="mV"
          Value3={avgValueRef.current[0] !== undefined ? avgValueRef.current[0].toString() : "0"}
        />
        
        <BigInfos
          Colors={["#21c997ff"]}
          Title1="MAX"
          Unit1="bpm"
          Value1={maxValueRef.current[1] !== undefined ? maxValueRef.current[1].toString() : "0"}
          Title2="MIN"
          Unit2="bpm"
          Value2={minValueRef.current[1] !== undefined ? minValueRef.current[1].toString() : "0"}
          Title3="AVG"
          Unit3="bpm"
          Value3={avgValueRef.current[1] !== undefined ? avgValueRef.current[1].toString() : "0"}
        />

        <BigInfos
          Colors={["#7a74ceff"]}
          Title1="MAX"
          Unit1="bpm"
          Value1={maxValueRef.current[2] !== undefined ? maxValueRef.current[2].toString() : "0"}
          Title2="MIN"
          Unit2="bpm"
          Value2={minValueRef.current[2] !== undefined ? minValueRef.current[2].toString() : "0"}
          Title3="AVG" 
          Unit3="bpm"
          Value3={avgValueRef.current[2] !== undefined ? avgValueRef.current[2].toString() : "0"}
        /> 
      </div>

      <div
      // we want it to start again from next line 
      className="rounded-b-md border"
      style={{width:"100%",height:"140px"}}
      > 

      <div className="p-1 grid grid-cols-3 gap-1 h-full"
        style={{height:"40px"}}
      >
        <div
          style={{height:"130px"}}
          className="border p-1 rounded-md"
        >
          <h2 className="font-bold mb-2">Information</h2>
          <div className="w-full h-20 text-green-400 font-mono text-sm overflow-y-auto rounded-lg p-0" 
          >
            <p>
              Name: Ismail <br></br>
              Age: 33<br></br>
              Height: 173 cm<br></br>
              Weight: 70.5 kg<br></br>
            </p>
          </div>
        </div>


        <div
          style={{height:"130px"}}
          className="border p-1 rounded-md"
        >
          <h2 className="font-bold mb-2">Blood Pressure</h2>
          <div className="w-full h-20 text-green-400 font-mono text-sm overflow-y-auto rounded-lg p-0" 
          ref={containerRef2}
          >
            {linesBp.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>

        <div
          style={{height:"130px"}}
          className="border p-1 rounded-md"
        >
          <h2 className="font-bold mb-2">Body Temp</h2>
          <div className="w-full h-20 text-green-400 font-mono text-sm overflow-y-auto rounded-lg p-0" 
          ref={containerRef2}
          >
            {linesBodyTemp.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>

      </div>
      </div>
      </div>
     </div>
  );
};

export default Medical;