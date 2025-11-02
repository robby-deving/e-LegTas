// components/cards/ReportCard.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Download, FileText, Trash2 } from 'lucide-react';
import calendarIcon from '@/assets/calendar-days.svg';

export type ReportCardItem = {
  id: string;
  name: string;
  type: string;
  disaster: string;
  format: 'PDF' | 'CSV' | 'XLSX';
  date: string;
  size: string;
  icon?: 'PDF' | 'CSV' | 'XLSX';
  publicUrl?: string | null;
  asOfISO?: string;
};

type Props = {
  report: ReportCardItem;
  onDownload: (r: ReportCardItem) => void | Promise<void>;
  onDelete: (r: ReportCardItem) => void | Promise<void>;
  canDelete?: boolean;
  canDownload?: boolean;
};


const getFileIcon = (format: string) => {
  const iconProps = 'w-10 h-6';
  switch (format) {
    case 'PDF':
      return <div className={`${iconProps} bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold`}>PDF</div>;
    case 'CSV':
      return <div className={`${iconProps} bg-orange-100 text-orange-400 rounded flex items-center justify-center text-xs font-bold`}>CSV</div>;
    case 'XLSX':
      return <div className={`${iconProps} bg-indigo-100 text-indigo-600 rounded flex items-center justify-center text-xs font-bold`}>XLSX</div>;
    default:
      return <FileText className={`${iconProps} text-gray-600`} />;
  }
};

export default function ReportCard({ report, onDownload, onDelete, canDelete = true, canDownload = true }: Props) {
  return (
    <Card className="relative group flex flex-col gap-0 rounded-xl h-full transition-transform duration-100 hover:scale-102 ease-in-out hover:shadow-md cursor-pointer border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between overflow-hidden text-ellipsis">
          <div className="flex gap-3 flex-col items-start min-w-0">
            {getFileIcon(report.format)}
            <div className="w-full min-w-0">
              <CardTitle className="text-xl font-bold text-gray-900" title={report.name}>{report.name}</CardTitle>
              <p className="text-sm text-green-600 font-semibold break-words whitespace-normal">{report.type}</p>
            </div>
          </div>
			<div className="flex gap-2 flex-shrink-0">
				{canDownload && (
					<button
						className="p-1 rounded transition opacity-100 group hover:bg-green-50"
						onClick={() => onDownload(report)}
						title="Download Report"
					>
						<Download className="w-4 h-4 text-gray-500 group-hover:text-green-700 cursor-pointer" />
					</button>
				)}
				{canDelete && (
					<button
						className="p-1 rounded transition opacity-100 group hover:bg-red-50"
						onClick={() => onDelete(report)}
						title="Delete Report"
					>
						<Trash2 className="w-4 h-4 text-gray-500 group-hover:text-red-600 cursor-pointer" />
					</button>
				)}
			</div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center space-x-1.5">
            <img src={calendarIcon} alt="Calendar" className="w-4 h-4" />
            <div className="text-xs font-medium text-gray-700">{report.date}</div>
            <div className="text-xs font-medium text-gray-700 ml-auto">{report.size}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

