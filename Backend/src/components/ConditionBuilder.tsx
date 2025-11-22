import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Info } from 'lucide-react';
import { CheckoutCondition } from '@/lib/checkout-flow-service';

interface ConditionBuilderProps {
  conditions: CheckoutCondition[];
  onChange: (conditions: CheckoutCondition[]) => void;
  title?: string;
  description?: string;
}

const CONDITION_TYPES = [
  {
    value: 'min_total',
    label: 'Minimum Order Total',
    description: 'Order must be above a certain amount',
    fields: ['amount']
  },
  {
    value: 'max_total',
    label: 'Maximum Order Total',
    description: 'Order must be below a certain amount',
    fields: ['amount']
  },
  {
    value: 'state_is',
    label: 'State Equals',
    description: 'Delivery state must match',
    fields: ['state']
  },
  {
    value: 'state_is_not',
    label: 'State Not Equals',
    description: 'Delivery state must not match',
    fields: ['state']
  },
  {
    value: 'country_is',
    label: 'Country Equals',
    description: 'Delivery country must match',
    fields: ['country']
  },
  {
    value: 'user_logged_in',
    label: 'User Login Required',
    description: 'User must be logged in or guest',
    fields: ['boolean']
  },
  {
    value: 'tn_shipping_restricted',
    label: 'Tamil Nadu Shipping Restriction',
    description: 'Check for TN shipping restricted products',
    fields: ['boolean']
  },
  {
    value: 'cart_item_count',
    label: 'Cart Item Count',
    description: 'Number of items in cart',
    fields: ['count', 'operator']
  },
  {
    value: 'product_category',
    label: 'Product Category',
    description: 'Cart contains products from category',
    fields: ['category', 'operator']
  },
  {
    value: 'product_tag',
    label: 'Product Tag',
    description: 'Cart contains products with tag',
    fields: ['tag', 'operator']
  }
];

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'greater_equal', label: 'Greater or Equal' },
  { value: 'less_equal', label: 'Less or Equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' }
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  conditions,
  onChange,
  title = "Conditions",
  description = "Define when this rule should apply"
}) => {
  const [newCondition, setNewCondition] = useState<Partial<CheckoutCondition>>({
    condition_type: 'min_total'
  });

  const addCondition = () => {
    if (!newCondition.condition_type) return;

    const condition: CheckoutCondition = {
      condition_type: newCondition.condition_type,
      operator: newCondition.operator || 'equals',
      value: newCondition.value || {},
      is_active: true
    };

    onChange([...conditions, condition]);
    setNewCondition({ condition_type: 'min_total' });
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<CheckoutCondition>) => {
    const updated = conditions.map((condition, i) => 
      i === index ? { ...condition, ...updates } : condition
    );
    onChange(updated);
  };

  const getConditionTypeInfo = (type: string) => {
    return CONDITION_TYPES.find(ct => ct.value === type);
  };

  const renderConditionValue = (condition: CheckoutCondition, index: number) => {
    const typeInfo = getConditionTypeInfo(condition.condition_type);
    if (!typeInfo) return null;

    const updateValue = (key: string, value: any) => {
      updateCondition(index, {
        value: { ...condition.value, [key]: value }
      });
    };

    return (
      <div className="grid gap-2">
        {typeInfo.fields.includes('amount') && (
          <div className="grid gap-1">
            <Label className="text-xs">Amount (₹)</Label>
            <Input
              type="number"
              min="0"
              value={condition.value?.amount || ''}
              onChange={(e) => updateValue('amount', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        )}

        {typeInfo.fields.includes('state') && (
          <div className="grid gap-1">
            <Label className="text-xs">State</Label>
            <Select
              value={condition.value?.state || ''}
              onValueChange={(value) => updateValue('state', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {typeInfo.fields.includes('country') && (
          <div className="grid gap-1">
            <Label className="text-xs">Country</Label>
            <Input
              value={condition.value?.country || ''}
              onChange={(e) => updateValue('country', e.target.value)}
              placeholder="India"
            />
          </div>
        )}

        {typeInfo.fields.includes('boolean') && (
          <div className="flex items-center space-x-2">
            <Switch
              checked={condition.value?.required !== false}
              onCheckedChange={(checked) => updateValue('required', checked)}
            />
            <Label className="text-xs">
              {condition.condition_type === 'user_logged_in' ? 'Must be logged in' : 'Must have restricted items'}
            </Label>
          </div>
        )}

        {typeInfo.fields.includes('count') && (
          <div className="grid gap-1">
            <Label className="text-xs">Count</Label>
            <Input
              type="number"
              min="0"
              value={condition.value?.count || ''}
              onChange={(e) => updateValue('count', parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        )}

        {typeInfo.fields.includes('category') && (
          <div className="grid gap-1">
            <Label className="text-xs">Category</Label>
            <Input
              value={condition.value?.category || ''}
              onChange={(e) => updateValue('category', e.target.value)}
              placeholder="electronics, clothing, etc."
            />
          </div>
        )}

        {typeInfo.fields.includes('tag') && (
          <div className="grid gap-1">
            <Label className="text-xs">Tag</Label>
            <Input
              value={condition.value?.tag || ''}
              onChange={(e) => updateValue('tag', e.target.value)}
              placeholder="sale, featured, etc."
            />
          </div>
        )}

        {typeInfo.fields.includes('operator') && (
          <div className="grid gap-1">
            <Label className="text-xs">Operator</Label>
            <Select
              value={condition.operator || 'equals'}
              onValueChange={(value) => updateCondition(index, { operator: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map(op => (
                  <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    );
  };

  const renderNewConditionForm = () => {
    const typeInfo = getConditionTypeInfo(newCondition.condition_type || 'min_total');
    
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus size={16} />
            Add New Condition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label className="text-xs">Condition Type</Label>
            <Select
              value={newCondition.condition_type}
              onValueChange={(value) => setNewCondition({ condition_type: value as any, value: {} })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {typeInfo && (
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              <Info size={12} className="inline mr-1" />
              {typeInfo.description}
            </div>
          )}

          <Button onClick={addCondition} size="sm" className="w-full">
            Add Condition
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {conditions.length > 0 && (
        <div className="space-y-3">
          {conditions.map((condition, index) => {
            const typeInfo = getConditionTypeInfo(condition.condition_type);
            
            return (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {typeInfo?.label || condition.condition_type}
                        </Badge>
                        <Switch
                          checked={condition.is_active !== false}
                          onCheckedChange={(checked) => updateCondition(index, { is_active: checked })}
                        />
                      </div>
                      
                      {renderConditionValue(condition, index)}
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeCondition(index)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {renderNewConditionForm()}

      {conditions.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Info size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No conditions set</p>
          <p className="text-xs">This rule will apply to all orders</p>
        </div>
      )}
    </div>
  );
};
