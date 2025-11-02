import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ZenthraEmbed } from '@/components/zenthra/ZenthraEmbed';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

const ZenthraThemes: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminLayout>
      <Dialog open onOpenChange={(o)=>{ if(!o) navigate('/admin'); }}>
        <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Themes</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <ZenthraEmbed path="/admin/themes?embed=1" title="Zenthra Theme Editor" iframeId="zenthra-themes" />
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ZenthraThemes;
