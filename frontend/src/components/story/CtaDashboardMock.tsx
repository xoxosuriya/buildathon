import React from 'react';
import { ChatPanel } from './ChatPanel';
import { VelorahHeroPreview } from './VelorahHeroPreview';

export const CtaDashboardMock: React.FC = () => {
  return (
    <div className="liquid-glass w-full max-w-[1100px] aspect-[3/4] sm:aspect-[16/10] lg:aspect-[16/9] rounded-2xl mx-auto overflow-hidden p-2 sm:p-3 bg-neutral-950/20 backdrop-blur-[20px]">
      <div className="grid h-full grid-cols-1 sm:grid-cols-[minmax(220px,320px)_1fr] gap-2 sm:gap-3">
        {/* Left Side Chat (hidden on mobile) */}
        <div className="min-h-0 hidden sm:block">
          <ChatPanel initialScroll="top" animateMessagesIn />
        </div>
        {/* Right Side Video Dashboard */}
        <div className="min-h-0 h-full">
          <VelorahHeroPreview />
        </div>
      </div>
    </div>
  );
};
