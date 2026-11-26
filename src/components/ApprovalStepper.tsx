import React from 'react';
import { Check, Clock, XCircle } from 'lucide-react';
import { Language } from '../types';
import { getText } from '../i18n';

export interface StepItem {
  labelAm: string;
  labelEn: string;
  actorAm?: string;
  actorEn?: string;
  state: 'completed' | 'current' | 'upcoming' | 'rejected';
}

interface ApprovalStepperProps {
  steps: StepItem[];
  lang: Language;
}

export const ApprovalStepper: React.FC<ApprovalStepperProps> = ({ steps, lang }) => {
  return (
    <div className="w-full py-2">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-2">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          return (
            <div key={idx} className="flex-1 flex sm:flex-col items-start gap-2.5 sm:gap-1.5">
              <div className="flex items-center w-full gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border text-xs font-semibold ${
                    step.state === 'completed'
                      ? 'bg-[#064E3B] border-[#064E3B] text-white'
                      : step.state === 'current'
                      ? 'bg-[#F59E0B]/15 border-[#D97706] text-[#D97706]'
                      : step.state === 'rejected'
                      ? 'bg-red-50 border-red-600 text-red-700'
                      : 'bg-slate-50 border-slate-300 text-slate-400'
                  }`}
                >
                  {step.state === 'completed' ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : step.state === 'rejected' ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : step.state === 'current' ? (
                    <Clock className="w-3.5 h-3.5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`hidden sm:block h-px flex-1 ${
                      step.state === 'completed' ? 'bg-[#047857]' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-xs font-semibold leading-tight ${
                    step.state === 'current'
                      ? 'text-[#D97706]'
                      : step.state === 'completed'
                      ? 'text-[#064E3B]'
                      : step.state === 'rejected'
                      ? 'text-red-700'
                      : 'text-slate-500'
                  }`}
                >
                  {getText(lang, step.labelAm, step.labelEn)}
                </p>
                {(step.actorAm || step.actorEn) && (
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {getText(lang, step.actorAm || '', step.actorEn || '')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
