import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ZenthraEmbed } from '@/components/zenthra/ZenthraEmbed';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

const ZenthraPlugins: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AdminLayout>
      <Dialog open onOpenChange={(o)=>{ if(!o) navigate('/admin'); }}>
        <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] overflow-y-auto">
          <div className="py-1">
            <ZenthraEmbed path="/admin/plugins?embed=1" title="Zenthra Plugins" iframeId="zenthra-plugins" />
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ZenthraPlugins;
