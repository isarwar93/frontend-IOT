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
    ], 2048);// buffer size 2048
  }, []);// run one time only

  useEffect(() => {
    if (channels.length === 0) return;
    
    // Helper function to update channel data
    const updateChannelData = (index: number, decimals: number = 0) => {
      const ch = channels[index];
      if (!ch) return;
      
      dataRef.current[index] = ch.buffer;
      lenRef.current[index] = ch.buffer.length-10;
      headRef.current[index] = ch.head;
      
      const roundFactor = Math.pow(10, decimals);
      maxValueRef.current[index] = Math.round((ch.max ?? 0) * roundFactor) / roundFactor;
      minValueRef.current[index] = Math.round((ch.min ?? 0) * roundFactor) / roundFactor;
      avgValueRef.current[index] = Math.round((ch.avg ?? 0) * roundFactor) / roundFactor;
    };
    
    // Update first 3 channels (ECG, heart_rate, respiration_rate) - no decimals
    for (let i = 0; i < Math.min(3, channels.length); i++) {
      updateChannelData(i, 0);
    }
    
    // Update blood pressure and body temperature - 1 decimal
    const bpIndex = channels.findIndex(ch => ch.name === "blood_pressure");
    const bodyTempIndex = channels.findIndex(ch => ch.name === "body_temperature");
    
    if (bpIndex !== -1) {
      updateChannelData(bpIndex, 1);
    }
    
    if (bodyTempIndex !== -1) {
      updateChannelData(bodyTempIndex, 1);
    }
    
    // Check if blood pressure and body temperature channels are updated
    const bodyTempChannel = channels[bodyTempIndex];
    
    if (!bodyTempChannel?.updated) return;

    
    // Get latest blood pressure value
    const bpData = dataRef.current[bpIndex];
    const bpHead = headRef.current[bpIndex];
    const bpValue = bpData && bpHead > 0 ? bpData[(bpHead - 1) % bpData.length] : NaN;

    // Get latest body temperature value
    const bodyTempData = dataRef.current[bodyTempIndex];
    const bodyTempHead = headRef.current[bodyTempIndex];
    const bodyTempValue = bodyTempData && bodyTempHead > 0 ? bodyTempData[(bodyTempHead - 1) % bodyTempData.length] : NaN;

    const date = new Date();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const showTime = `${hours}:${minutes}:${seconds}`;
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
        bufferCapacity={2048}
        lineColors={["#afa22bff"]}
        graphTitle="ECG"
        storeMin={minValueRef.current[0]}
        storeMax={maxValueRef.current[0]}
      /> 
      <FastLineCanvas 
        valuesList={[dataRef.current[1]]}
        currentHead={headRef.current[1]}
        xAxisDataPoints={lenRef.current[1]}
        numSeries={1}
        bufferCapacity={2048}
        lineColors={["#2faf2bff"]}
        graphTitle="Pulse"
        storeMin={minValueRef.current[1]}
        storeMax={maxValueRef.current[1]}
      />

      <FastLineCanvas 
        valuesList={[dataRef.current[2]]}
        currentHead={headRef.current[2]}
        xAxisDataPoints={lenRef.current[2]}
        numSeries={1}
        bufferCapacity={2048}
        lineColors={["#ca4821ff"]}
        graphTitle="Resp"
        storeMin={minValueRef.current[2]}
        storeMax={maxValueRef.current[2]}
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