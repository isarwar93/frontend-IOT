
type Props = {
  Colors: string[] | undefined;
  Title1?: string;
  Unit1?: string;
  Value1?: string;
  Title2?: string;
  Unit2?: string;
  Value2?: string;
  Title3?: string;
  Unit3?: string;
  Value3?: string;
};

export default function BigInfos({
  Colors: extLineColors,
  Title1,
  Unit1,
  Value1,
  Title2,
  Unit2,
  Value2,
  Title3,
  Unit3,
  Value3
}: Props) {

  // render container
  return (
    <div 
      className={`border-t-0 border-l-0 border flex relative flex-row justify-start`}
      style={{width:"100%",  height: "33.3%"}}
    >
            
      <OneInfoBox
        color={extLineColors && extLineColors.length>0 ? extLineColors[0]: "#2563EB"}
        title={Title1 ?? ""}
        value= {Value1 ?? "0"}
        unit={Unit1 ?? ""}
      />

      <OneInfoBox
        color={extLineColors && extLineColors.length>0 ? extLineColors[0]: "#2563EB"}
        title={Title2 ?? ""}
        value= {Value2 ?? "0"}
        unit={Unit2 ?? ""}
      />

      <OneInfoBox
        color={extLineColors && extLineColors.length>0 ? extLineColors[0]: "#2563EB"}
        title={Title3 ?? ""}
        value= {Value3 ?? "0"}
        unit={Unit3 ?? ""}
        />
    </div>
      
  );
}

const OneInfoBox = ({
  title,
  value,
  unit,
  color
}: {
  title: string;
  value: string;
  unit: string;
  color?: string;
}) => {
  return (
    <div 
      className="flex-col w-1/3 border borer-r-0 border-b-0 border-l-1 border-t-0 border-gray-550"
    >
      <div className="font-mono font-semibold"
        style={{color: color}}
      >
      {title}
      </div>
      <div 
        className="font-mono font-semibold text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl absolute top-1/2 transform -translate-y-1/2"
        style={{color: color}}
        >
      {value}
      </div>

      <div className="font-semibold absolute bottom-0"
        style={{color: color }}
        >
        {unit ?? "Unit"}
      </div>
    </div>
      
  );
} 