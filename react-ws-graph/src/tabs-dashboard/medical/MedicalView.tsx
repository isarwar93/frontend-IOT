import React, { useEffect, useRef, useState } from "react";
import MedTopBar  from "./MedTopBar";
import FastLineCanvas from "./FastLineCanvas";
import BigInfos from "./BigInfos";
import { initChannels  } from "./MedWebSocket";
import { useDataStore, useMedicalStore } from "./useMedicalStore";


export const Medical: React.FC = () => {

  const containerRef = useRef<HTMLDivElement | null>(null);
  const channels = useDataStore((s) => s.channels);
  const medicalBufferSize = useMedicalStore((s) => s.medicalBufferSize);
  const dataRef = useRef<Float32Array[]>([]);
  const headRef = useRef<number[]>([]);
  const lenRef = useRef<number[]>([]);
  const maxValueRef = useRef<number[]>([]);
  const minValueRef = useRef<number[]>([]);
  const avgValueRef = useRef<number[]>([]);
  const [linesBp, setLinesBp] = useState<string[]>([]);
  const [linesBodyTemp, setLinesBodyTemp] = useState<string[]>([]);
  const bpContainerRef = useRef<HTMLDivElement>(null);
  const bodyTempContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    initChannels(["ecg", "heart_rate", "respiration_rate",
        "blood_pressure", "body_temperature"
    ], medicalBufferSize);
  }, [medicalBufferSize]);

  useEffect(() => {
    if (channels.length === 0) return;
    
    // Helper function to update channel data
    const updateChannelData = (index: number, decimals: number = 0) => {
      const ch = channels[index];
      if (!ch) return;
      
      dataRef.current[index] = ch.buffer;
      lenRef.current[index] = ch.buffer.length;
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
      const newLines = [...prev, `${showTime} → ${bpValue.toFixed(1)} mmHg`];
      // keep only last 20 lines
      return newLines.slice(-20);
    });
      
    setLinesBodyTemp(prev => {

      if (isNaN(bodyTempValue)) {
        return prev;
      }
      const newLines = [...prev, `${showTime} → ${bodyTempValue.toFixed(1)} °C`];
      // keep only last 20 lines
      return newLines.slice(-20);
    });

    channels.forEach(ch => ch.updated = false);
  }, [channels]);

  // Auto-scroll blood pressure to bottom when new lines are added
  useEffect(() => {
    if (bpContainerRef.current) {
      bpContainerRef.current.scrollTop = bpContainerRef.current.scrollHeight;
    }
  }, [linesBp]);

  // Auto-scroll body temperature to bottom when new lines are added
  useEffect(() => {
    if (bodyTempContainerRef.current) {
      bodyTempContainerRef.current.scrollTop = bodyTempContainerRef.current.scrollHeight;
    }
  }, [linesBodyTemp]);

 
 

  return (
    <div className="space-y-2">
      <MedTopBar />
      <div
       ref={containerRef}
       className={`rounded-xl p-0 flex flex-wrap shadow-2xl bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900`}
       style={{ width: "100%", height: "465px" }}
      >
      <div
        className="rounded-tl-xl p-1.5 border-2 border-b-0 border-r-0 border-blue-300/30 dark:border-cyan-500/30 bg-gradient-to-br from-white via-blue-50/30 to-slate-50 dark:from-slate-900 dark:via-blue-950/50 dark:to-slate-950"
        style={{width:"70%",height:"350px"}}  
      >
      <FastLineCanvas  
        valuesList={[dataRef.current[0]]}
        currentHead={headRef.current[0]}
        xAxisDataPoints={medicalBufferSize}
        numSeries={1}
        bufferCapacity={medicalBufferSize}
        lineColors={["#10b981"]}
        graphTitle="ECG"
        storeMin={minValueRef.current[0]}
        storeMax={maxValueRef.current[0]}
        showTopBorder={true}
        roundedTopLeft={true}
      /> 
      <FastLineCanvas 
        valuesList={[dataRef.current[1]]}
        currentHead={headRef.current[1]}
        xAxisDataPoints={medicalBufferSize}
        numSeries={1}
        bufferCapacity={medicalBufferSize}
        lineColors={["#3b82f6"]}
        graphTitle="Pulse"
        storeMin={minValueRef.current[1]}
        storeMax={maxValueRef.current[1]}
      />

      <FastLineCanvas 
        valuesList={[dataRef.current[2]]}
        currentHead={headRef.current[2]}
        xAxisDataPoints={medicalBufferSize}
        numSeries={1}
        bufferCapacity={medicalBufferSize}
        lineColors={["#f59e0b"]}
        graphTitle="Respiration"
        storeMin={minValueRef.current[2]}
        storeMax={maxValueRef.current[2]}
      />
      </div> 
      <div
        className="rounded-tr-xl border-2 border-b-0 border-blue-300/30 dark:border-cyan-500/30 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950 p-1.5"
        style={{width:"30%",height:"350px"}}  
      >
        <BigInfos
          Colors={["#10b981"]}
          Title1="MIN"
          Unit1="mV"
          Value1={minValueRef.current[0] !== undefined ? minValueRef.current[0].toString() : "0"}
          Title2="AVG"
          Unit2="mV"
          Value2={avgValueRef.current[0] !== undefined ? avgValueRef.current[0].toString() : "0"}
          Title3="MAX" 
          Unit3="mV"
          Value3={maxValueRef.current[0] !== undefined ? maxValueRef.current[0].toString() : "0"}
          showTopBorder={true}
          roundedTopRight={true}
        />
        
        <BigInfos
          Colors={["#3b82f6"]}
          Title1="MIN"
          Unit1="bpm"
          Value1={minValueRef.current[1] !== undefined ? minValueRef.current[1].toString() : "0"}
          Title2="AVG"
          Unit2="bpm"
          Value2={avgValueRef.current[1] !== undefined ? avgValueRef.current[1].toString() : "0"}
          Title3="MAX"
          Unit3="bpm"
          Value3={maxValueRef.current[1] !== undefined ? maxValueRef.current[1].toString() : "0"}
        />

        <BigInfos
          Colors={["#f59e0b"]}
          Title1="MIN"
          Unit1="bpm"
          Value1={minValueRef.current[2] !== undefined ? minValueRef.current[2].toString() : "0"}
          Title2="AVG"
          Unit2="bpm"
          Value2={avgValueRef.current[2] !== undefined ? avgValueRef.current[2].toString() : "0"}
          Title3="MAX" 
          Unit3="bpm"
          Value3={maxValueRef.current[2] !== undefined ? maxValueRef.current[2].toString() : "0"}
        /> 
      </div>

      <div
      // we want it to start again from next line 
      className="rounded-b-xl border-2 border-blue-300/30 dark:border-cyan-500/30 bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-slate-900 dark:via-slate-950 dark:to-blue-950 p-2"
      style={{width:"100%",height:"165px"}}
      > 

      <div className="grid grid-cols-4 gap-2 h-full">
        <div
          className="border-2 border-blue-400/30 dark:border-cyan-500/30 p-2 rounded-lg bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-blue-950/50 dark:via-slate-900 dark:to-cyan-950/50 shadow-lg flex flex-col min-h-0 overflow-hidden"
        >
          <h2 className="font-bold text-sm mb-1 text-blue-700 dark:text-cyan-400 flex items-center gap-1.5 flex-shrink-0">
            <span className="text-base">👤</span> User Info
          </h2>
          <div className="flex-1 text-slate-700 dark:text-slate-300 font-mono text-xs overflow-y-auto rounded p-1.5 bg-white/50 dark:bg-slate-950/50 border border-blue-200 dark:border-blue-800 min-h-0" 
          >
            <p className="leading-relaxed">
              <span className="text-blue-600 dark:text-cyan-400 font-semibold">Name:</span> Ismail <br></br>
              <span className="text-blue-600 dark:text-cyan-400 font-semibold">Age:</span> 33 years<br></br>
              <span className="text-blue-600 dark:text-cyan-400 font-semibold">Height:</span> 173 cm<br></br>
              <span className="text-blue-600 dark:text-cyan-400 font-semibold">Weight:</span> 70.5 kg<br></br>
            </p>
          </div>
        </div>

        <div
          className="border-2 border-purple-400/30 dark:border-purple-500/30 p-2 rounded-lg bg-gradient-to-br from-purple-50 via-white to-violet-50 dark:from-purple-950/50 dark:via-slate-900 dark:to-violet-950/50 shadow-lg flex flex-col min-h-0 overflow-hidden"
        >
          <h2 className="font-bold text-sm mb-1 text-purple-700 dark:text-purple-400 flex items-center gap-1.5 flex-shrink-0">
            <span className="text-base">🏠</span> Room Conditions
          </h2>
          <div className="flex-1 text-slate-700 dark:text-slate-300 font-mono text-xs overflow-y-auto rounded p-1.5 bg-white/50 dark:bg-slate-950/50 border border-purple-200 dark:border-purple-800 min-h-0" 
          >
            <p className="leading-relaxed">
              <span className="text-purple-600 dark:text-purple-400 font-semibold">Temperature:</span> 23.5 °C<br></br>
              <span className="text-purple-600 dark:text-purple-400 font-semibold">Humidity:</span> 45%<br></br>
              <span className="text-purple-600 dark:text-purple-400 font-semibold">Pressure:</span> 1013 hPa<br></br>
              <span className="text-purple-600 dark:text-purple-400 font-semibold">Air Quality:</span> Good<br></br>
            </p>
          </div>
        </div>


        <div
          className="border-2 border-red-400/30 dark:border-pink-500/30 p-2 rounded-lg bg-gradient-to-br from-red-50 via-white to-pink-50 dark:from-red-950/50 dark:via-slate-900 dark:to-pink-950/50 shadow-lg flex flex-col min-h-0 overflow-hidden"
        >
          <h2 className="font-bold text-sm mb-1 text-red-700 dark:text-pink-400 flex items-center gap-1.5 flex-shrink-0">
            <span className="text-base">❤️</span> Blood Pressure
          </h2>
          <div className="flex-1 text-slate-700 dark:text-slate-300 font-mono text-xs overflow-y-auto rounded p-1.5 bg-white/50 dark:bg-slate-950/50 border border-red-200 dark:border-red-800 min-h-0" 
          ref={bpContainerRef}
          >
            {linesBp.map((line, i) => (
              <div key={i} className="text-red-600 dark:text-pink-400 leading-tight">{line}</div>
            ))}
          </div>
        </div>

        <div
          className="border-2 border-orange-400/30 dark:border-amber-500/30 p-2 rounded-lg bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-orange-950/50 dark:via-slate-900 dark:to-amber-950/50 shadow-lg flex flex-col min-h-0 overflow-hidden"
        >
          <h2 className="font-bold text-sm mb-1 text-orange-700 dark:text-amber-400 flex items-center gap-1.5 flex-shrink-0">
            <span className="text-base">🌡️</span> Body Temperature
          </h2>
          <div className="flex-1 text-slate-700 dark:text-slate-300 font-mono text-xs overflow-y-auto rounded p-1.5 bg-white/50 dark:bg-slate-950/50 border border-orange-200 dark:border-orange-800 min-h-0" 
          ref={bodyTempContainerRef}
          >
            {linesBodyTemp.map((line, i) => (
              <div key={i} className="text-orange-600 dark:text-amber-400 leading-tight">{line}</div>
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