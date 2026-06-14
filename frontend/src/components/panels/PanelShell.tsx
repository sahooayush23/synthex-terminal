import { X } from 'lucide-react';

import { findFunction } from '@/data/functions';
import { useTerminal, type PanelInstance } from '@/stores/terminal';

import { AiPanel } from './AiPanel';
import { BoardPanel } from './BoardPanel';
import { CactPanel } from './CactPanel';
import { CalPanel } from './CalPanel';
import { CrypPanel } from './CrypPanel';
import { DashPanel } from './DashPanel';
import { DesPanel } from './DesPanel';
import { EePanel } from './EePanel';
import { EqsPanel } from './EqsPanel';
import { FaPanel } from './FaPanel';
import { FredPanel } from './FredPanel';
import { FxPanel } from './FxPanel';
import { GpPanel } from './GpPanel';
import { FltPanel } from './FltPanel';
import { HelpPanel } from './HelpPanel';
import { HmapPanel } from './HmapPanel';
import { InsdrPanel } from './InsdrPanel';
import { IpoPanel } from './IpoPanel';
import { LotPanel } from './LotPanel';
import { MovPanel } from './MovPanel';
import { MygPanel } from './MygPanel';
import { NewsPanel } from './NewsPanel';
import { OmonPanel } from './OmonPanel';
import { PaperPanel } from './PaperPanel';
import { PlaceholderPanel } from './PlaceholderPanel';
import { PortPanel } from './PortPanel';
import { QntPanel } from './QntPanel';
import { RiskPanel } from './RiskPanel';
import { ScatPanel } from './ScatPanel';
import { SocPanel } from './SocPanel';
import { XlsPanel } from './XlsPanel';

/** Shared chrome around every workspace panel: drag-handle title bar with the
 *  function code, plus a close button. Body is routed by function code. */
export function PanelShell({ panel, tabId }: { panel: PanelInstance; tabId: string }) {
  const closePanel = useTerminal((s) => s.closePanel);
  const fn = findFunction(panel.code);

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-md border border-bd bg-panel">
      <header className="flex h-7 shrink-0 select-none items-center gap-2 border-b border-bd bg-panel2/60 px-2">
        <span className="rounded bg-accent/15 px-1 font-mono text-[10px] font-bold text-accent">
          {fn?.code ?? panel.code}
        </span>
        <span className="truncate text-[11px] font-medium text-muted">{fn?.name ?? 'Unknown'}</span>
        <button
          onClick={() => closePanel(tabId, panel.i)}
          title="Close panel"
          className="ml-auto rounded p-0.5 text-muted hover:bg-bd hover:text-fg"
        >
          <X size={12} />
        </button>
      </header>
      <div className="min-h-0 flex-1">
        <PanelBody code={panel.code} />
      </div>
    </section>
  );
}

function PanelBody({ code }: { code: string }) {
  switch (code) {
    case 'DES':
      return <DesPanel />;
    case 'GP':
      return <GpPanel />;
    case 'FA':
      return <FaPanel />;
    case 'EE':
      return <EePanel />;
    case 'N':
      return <NewsPanel />;
    case 'MOV':
      return <MovPanel />;
    case 'WEI':
      return <BoardPanel board="indices" title="World Equity Indices" />;
    case 'SECT':
      return <BoardPanel board="sectors" title="US Sectors" />;
    case 'CMTY':
      return <BoardPanel board="commodities" title="Commodities" />;
    case 'CETF':
      return <BoardPanel board="countries" title="Countries" />;
    case 'FX':
      return <FxPanel />;
    case 'CRYP':
      return <CrypPanel />;
    case 'HMAP':
      return <HmapPanel />;
    case 'SCAT':
      return <ScatPanel />;
    case 'EQS':
      return <EqsPanel />;
    case 'CACT':
      return <CactPanel />;
    case 'SOC':
      return <SocPanel />;
    case 'CAL':
      return <CalPanel />;
    case 'INSDR':
      return <InsdrPanel />;
    case 'IPO':
      return <IpoPanel />;
    case 'ECO':
      return <FredPanel name="eco" title="World Economics" />;
    case 'GYLD':
      return <FredPanel name="gyld" title="Global Yields" />;
    case 'CORP':
      return <FredPanel name="corp" title="Corporate Credit" />;
    case 'PORT':
      return <PortPanel />;
    case 'RISK':
      return <RiskPanel />;
    case 'OMON':
      return <OmonPanel />;
    case 'PAPER':
      return <PaperPanel />;
    case 'QNT':
      return <QntPanel />;
    case 'XLS':
      return <XlsPanel />;
    case 'LOT':
      return <LotPanel />;
    case 'MYG':
      return <MygPanel />;
    case 'DASH':
      return <DashPanel />;
    case 'AI':
      return <AiPanel />;
    case 'FLT':
      return <FltPanel />;
    case 'HELP':
      return <HelpPanel />;
    default:
      return <PlaceholderPanel code={code} />;
  }
}
