import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  Settings,
  CreditCard,
  Truck,
  ShoppingCart,
  Users,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Info,
  RefreshCw
} from 'lucide-react';
import {
  CheckoutFlow,
  CheckoutStep,
  PaymentMethod,
  CheckoutCondition,
  getCheckoutFlows,
  getCheckoutSteps,
  getPaymentMethods,
  createCheckoutFlow,
  updateCheckoutFlow,
  deleteCheckoutFlow,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  migrateFromLegacyFlow
} from '@/lib/checkout-flow-service';
import { ConditionBuilder } from '@/components/ConditionBuilder';
import { ConditionTester } from '@/components/ConditionTester';

const CheckoutFlowPage: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data states
  const [flows, setFlows] = useState<CheckoutFlow[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<CheckoutFlow | null>(null);
  const [steps, setSteps] = useState<CheckoutStep[]>([]);
  
  // Dialog states
  const [flowDialogOpen, setFlowDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [conditionDialogOpen, setConditionDialogOpen] = useState(false);
  
  // Form states
  const [editingFlow, setEditingFlow] = useState<Partial<CheckoutFlow>>({});
  const [editingPayment, setEditingPayment] = useState<Partial<PaymentMethod>>({});
  const [editingCondition, setEditingCondition] = useState<Partial<CheckoutCondition>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Try to load from PocketBase first
      const [flowsData, paymentsData] = await Promise.all([
        getCheckoutFlows(),
        getPaymentMethods()
      ]);
      
      // If no data exists, try migration
      if (flowsData.length === 0 && paymentsData.length === 0) {
        console.log('No checkout flow data found, attempting migration...');
        const migrated = await migrateFromLegacyFlow();
        if (migrated) {
          // Reload data after migration
          const [newFlowsData, newPaymentsData] = await Promise.all([
            getCheckoutFlows(),
            getPaymentMethods()
          ]);
          setFlows(newFlowsData);
          setPaymentMethods(newPaymentsData);
          if (newFlowsData.length > 0) {
            setSelectedFlow(newFlowsData[0]);
          }
        }
      } else {
        setFlows(flowsData);
        setPaymentMethods(paymentsData);
        if (flowsData.length > 0) {
          setSelectedFlow(flowsData[0]);
        }
      }
      
      // Load steps for selected flow
      if (selectedFlow) {
        const stepsData = await getCheckoutSteps(selectedFlow.id);
        setSteps(stepsData);
      }
    } catch (error) {
      console.error('Error loading checkout flow data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load checkout flow data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedFlow) {
      const loadSteps = async () => {
        const stepsData = await getCheckoutSteps(selectedFlow.id);
        setSteps(stepsData);
      };
      loadSteps();
    }
  }, [selectedFlow]);

  const handleSaveFlow = async () => {
    try {
      setSaving(true);
      
      if (editingFlow.id) {
        // Update existing flow
        const updated = await updateCheckoutFlow(editingFlow.id, editingFlow);
        if (updated) {
          setFlows(flows.map(f => f.id === updated.id ? updated : f));
          toast({
            title: 'Success',
            description: 'Checkout flow updated successfully',
          });
        }
      } else {
        // Create new flow
        const created = await createCheckoutFlow({
          ...editingFlow,
          is_active: editingFlow.is_active ?? true,
          is_default: editingFlow.is_default ?? false,
          priority: editingFlow.priority ?? 1,
        });
        if (created) {
          setFlows([...flows, created]);
          toast({
            title: 'Success',
            description: 'Checkout flow created successfully',
          });
        }
      }
      
      setFlowDialogOpen(false);
      setEditingFlow({});
    } catch (error) {
      console.error('Error saving flow:', error);
      toast({
        title: 'Error',
        description: 'Failed to save checkout flow',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePaymentMethod = async () => {
    try {
      setSaving(true);
      
      if (editingPayment.id) {
        // Update existing payment method
        const updated = await updatePaymentMethod(editingPayment.id, editingPayment);
        if (updated) {
          setPaymentMethods(paymentMethods.map(p => p.id === updated.id ? updated : p));
          toast({
            title: 'Success',
            description: 'Payment method updated successfully',
          });
        }
      } else {
        // Create new payment method
        const created = await createPaymentMethod({
          ...editingPayment,
          is_enabled: editingPayment.is_enabled ?? true,
          priority: editingPayment.priority ?? 1,
        });
        if (created) {
          setPaymentMethods([...paymentMethods, created]);
          toast({
            title: 'Success',
            description: 'Payment method created successfully',
          });
        }
      }
      
      setPaymentDialogOpen(false);
      setEditingPayment({});
    } catch (error) {
      console.error('Error saving payment method:', error);
      toast({
        title: 'Error',
        description: 'Failed to save payment method',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFlow = async (id: string) => {
    if (confirm('Are you sure you want to delete this checkout flow?')) {
      const success = await deleteCheckoutFlow(id);
      if (success) {
        setFlows(flows.filter(f => f.id !== id));
        if (selectedFlow?.id === id) {
          setSelectedFlow(flows.find(f => f.id !== id) || null);
        }
        toast({
          title: 'Success',
          description: 'Checkout flow deleted successfully',
        });
      }
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment method?')) {
      const success = await deletePaymentMethod(id);
      if (success) {
        setPaymentMethods(paymentMethods.filter(p => p.id !== id));
        toast({
          title: 'Success',
          description: 'Payment method deleted successfully',
        });
      }
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin h-8 w-8" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Checkout Flow Manager</h1>
            <p className="text-muted-foreground max-w-2xl text-sm mt-1">
              Configure checkout steps, payment methods, and conditions with an easy-to-use visual editor.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => loadData()} variant="outline" size="sm">
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs defaultValue="flows" className="space-y-4">
          <TabsList>
            <TabsTrigger value="flows">Checkout Flows</TabsTrigger>
            <TabsTrigger value="payments">Payment Methods</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="flows" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Checkout Flows</h2>
              <Dialog open={flowDialogOpen} onOpenChange={setFlowDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingFlow({})}>
                    <Plus size={16} className="mr-2" />
                    New Flow
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingFlow.id ? 'Edit Checkout Flow' : 'Create Checkout Flow'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="flow-name">Flow Name</Label>
                      <Input
                        id="flow-name"
                        value={editingFlow.name || ''}
                        onChange={(e) => setEditingFlow({ ...editingFlow, name: e.target.value })}
                        placeholder="e.g., Default Checkout Flow"
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="flow-description">Description</Label>
                      <Textarea
                        id="flow-description"
                        value={editingFlow.description || ''}
                        onChange={(e) => setEditingFlow({ ...editingFlow, description: e.target.value })}
                        placeholder="Describe when this flow should be used..."
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="flow-active"
                          checked={editingFlow.is_active ?? true}
                          onCheckedChange={(checked) => setEditingFlow({ ...editingFlow, is_active: checked })}
                        />
                        <Label htmlFor="flow-active">Active</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="flow-default"
                          checked={editingFlow.is_default ?? false}
                          onCheckedChange={(checked) => setEditingFlow({ ...editingFlow, is_default: checked })}
                        />
                        <Label htmlFor="flow-default">Default Flow</Label>
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="flow-priority">Priority (1-100)</Label>
                      <Input
                        id="flow-priority"
                        type="number"
                        min="1"
                        max="100"
                        value={editingFlow.priority || 1}
                        onChange={(e) => setEditingFlow({ ...editingFlow, priority: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setFlowDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveFlow} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Flow'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {flows.map((flow) => (
                <Card key={flow.id} className={selectedFlow?.id === flow.id ? 'ring-2 ring-primary' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{flow.name}</CardTitle>
                        {flow.is_default && <Badge>Default</Badge>}
                        {flow.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedFlow(flow)}
                        >
                          <Settings size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingFlow(flow);
                            setFlowDialogOpen(true);
                          }}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteFlow(flow.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    {flow.description && (
                      <CardDescription>{flow.description}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Payment Methods</h2>
              <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingPayment({})}>
                    <Plus size={16} className="mr-2" />
                    New Payment Method
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPayment.id ? 'Edit Payment Method' : 'Create Payment Method'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="payment-key">Method Key</Label>
                        <Input
                          id="payment-key"
                          value={editingPayment.method_key || ''}
                          onChange={(e) => setEditingPayment({ ...editingPayment, method_key: e.target.value })}
                          placeholder="e.g., razorpay, cod"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="payment-name">Display Name</Label>
                        <Input
                          id="payment-name"
                          value={editingPayment.name || ''}
                          onChange={(e) => setEditingPayment({ ...editingPayment, name: e.target.value })}
                          placeholder="e.g., UPI / Cards / Wallets"
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="payment-description">Description</Label>
                      <Textarea
                        id="payment-description"
                        value={editingPayment.description || ''}
                        onChange={(e) => setEditingPayment({ ...editingPayment, description: e.target.value })}
                        placeholder="Describe this payment method..."
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="payment-icon">Icon</Label>
                        <Input
                          id="payment-icon"
                          value={editingPayment.icon || ''}
                          onChange={(e) => setEditingPayment({ ...editingPayment, icon: e.target.value })}
                          placeholder="e.g., CreditCard, Truck"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="payment-priority">Priority</Label>
                        <Input
                          id="payment-priority"
                          type="number"
                          min="1"
                          max="100"
                          value={editingPayment.priority || 1}
                          onChange={(e) => setEditingPayment({ ...editingPayment, priority: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="payment-enabled"
                        checked={editingPayment.is_enabled ?? true}
                        onCheckedChange={(checked) => setEditingPayment({ ...editingPayment, is_enabled: checked })}
                      />
                      <Label htmlFor="payment-enabled">Enabled</Label>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Availability Conditions</Label>
                      <div className="border rounded-lg p-4">
                        <ConditionBuilder
                          conditions={editingPayment.conditions || []}
                          onChange={(conditions) => setEditingPayment({ ...editingPayment, conditions })}
                          title="When should this payment method be available?"
                          description="Set rules for when customers can use this payment option"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSavePaymentMethod} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Payment Method'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {paymentMethods.map((method) => (
                <Card key={method.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {method.icon === 'CreditCard' && <CreditCard size={20} />}
                        {method.icon === 'Truck' && <Truck size={20} />}
                        <div>
                          <CardTitle className="text-base">{method.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Key: <code className="bg-muted px-1 py-0.5 rounded text-xs">{method.method_key}</code>
                          </p>
                        </div>
                        {method.is_enabled ? (
                          <Badge variant="default">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingPayment(method);
                            setPaymentDialogOpen(true);
                          }}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeletePaymentMethod(method.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    {method.description && (
                      <CardDescription>{method.description}</CardDescription>
                    )}
                  </CardHeader>
                  
                  {method.conditions && method.conditions.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Conditions:</p>
                        <div className="space-y-1">
                          {method.conditions.map((condition, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {condition.condition_type || condition.type}
                              </Badge>
                              {condition.value?.amount && <span>₹{condition.value.amount}</span>}
                              {condition.value?.state && <span>{condition.value.state}</span>}
                              {typeof condition.value === 'boolean' && (
                                <span>{condition.value ? 'true' : 'false'}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="conditions" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Flow Conditions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings size={20} />
                    Flow Conditions
                  </CardTitle>
                  <CardDescription>
                    Set conditions for when this checkout flow should be used.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedFlow ? (
                    <ConditionBuilder
                      conditions={selectedFlow.conditions || []}
                      onChange={(conditions) => {
                        const updated = { ...selectedFlow, conditions };
                        setSelectedFlow(updated);
                        // Auto-save flow conditions
                        updateCheckoutFlow(selectedFlow.id, { conditions });
                      }}
                      title="Flow Activation Rules"
                      description="Define when this checkout flow should be active for customers"
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Select a checkout flow to configure conditions</p>
                      <p className="text-sm">Choose a flow from the Checkout Flows tab first</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Method Conditions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard size={20} />
                    Payment Method Conditions
                  </CardTitle>
                  <CardDescription>
                    Configure when each payment method should be available.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <Card key={method.id} className="border-l-4 border-l-primary/20">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            {method.icon === 'CreditCard' && <CreditCard size={16} />}
                            {method.icon === 'Truck' && <Truck size={16} />}
                            <CardTitle className="text-sm">{method.name}</CardTitle>
                            <Badge variant={method.is_enabled ? 'default' : 'secondary'} className="text-xs">
                              {method.is_enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ConditionBuilder
                            conditions={method.conditions || []}
                            onChange={(conditions) => {
                              updatePaymentMethod(method.id, { conditions });
                              setPaymentMethods(paymentMethods.map(p => 
                                p.id === method.id ? { ...p, conditions } : p
                              ));
                            }}
                            title={`${method.name} Availability`}
                            description={`When should ${method.name} be offered to customers?`}
                          />
                        </CardContent>
                      </Card>
                    ))}
                    
                    {paymentMethods.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No payment methods configured</p>
                        <p className="text-sm">Add payment methods in the Payment Methods tab first</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Condition Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle size={20} />
                  Test Conditions
                </CardTitle>
                <CardDescription>
                  Test how your conditions work with different cart scenarios.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConditionTester
                  paymentMethods={paymentMethods}
                  flowConditions={selectedFlow?.conditions}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Checkout Flow Preview</CardTitle>
                <CardDescription>
                  See how your checkout flow will appear to customers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Preview functionality coming soon...</p>
                  <p className="text-sm">This will show a live preview of the checkout process with your configured settings.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default CheckoutFlowPage;
