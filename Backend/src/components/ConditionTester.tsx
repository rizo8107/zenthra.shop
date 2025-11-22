import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { 
  CheckoutCondition, 
  PaymentMethod, 
  evaluateAllConditions,
  CheckoutContext 
} from '@/lib/checkout-flow-service';

interface ConditionTesterProps {
  paymentMethods: PaymentMethod[];
  flowConditions?: CheckoutCondition[];
}

interface TestScenario {
  orderTotal: number;
  deliveryState: string;
  isLoggedIn: boolean;
  hasRestrictedItems: boolean;
  itemCount: number;
}

export const ConditionTester: React.FC<ConditionTesterProps> = ({
  paymentMethods,
  flowConditions = []
}) => {
  const [scenario, setScenario] = useState<TestScenario>({
    orderTotal: 1500,
    deliveryState: 'Karnataka',
    isLoggedIn: true,
    hasRestrictedItems: false,
    itemCount: 2
  });

  const [testResults, setTestResults] = useState<{
    availablePayments: PaymentMethod[];
    blockedPayments: Array<{ method: PaymentMethod; reason: string }>;
    flowActive: boolean;
    flowBlockReason?: string;
  } | null>(null);

  const runTest = () => {
    // Create checkout context from scenario
    const context: CheckoutContext = {
      subtotal: scenario.orderTotal - 50, // Assume ₹50 shipping
      shippingCost: 50,
      discountTotal: 0,
      total: scenario.orderTotal,
      destinationState: scenario.deliveryState,
      destinationCountry: 'India',
      isGuest: !scenario.isLoggedIn,
      items: Array.from({ length: scenario.itemCount }, (_, i) => ({
        productId: `test-${i}`,
        category: 'electronics',
        tags: ['featured'],
        tn_shipping_enabled: !scenario.hasRestrictedItems
      }))
    };

    // Test flow conditions
    const flowActive = evaluateAllConditions(flowConditions, context);
    let flowBlockReason: string | undefined;
    
    if (!flowActive && flowConditions.length > 0) {
      // Find which condition failed
      const failedCondition = flowConditions.find(condition => 
        !evaluateCondition(condition, context)
      );
      if (failedCondition) {
        flowBlockReason = getConditionFailureReason(failedCondition, context);
      }
    }

    // Test payment methods
    const availablePayments: PaymentMethod[] = [];
    const blockedPayments: Array<{ method: PaymentMethod; reason: string }> = [];

    paymentMethods.forEach(method => {
      if (!method.is_enabled) {
        blockedPayments.push({ method, reason: 'Payment method is disabled' });
        return;
      }

      const isAvailable = evaluateAllConditions(method.conditions, context);
      
      if (isAvailable) {
        availablePayments.push(method);
      } else {
        // Find which condition failed
        const failedCondition = method.conditions?.find(condition => 
          !evaluateCondition(condition, context)
        );
        const reason = failedCondition 
          ? getConditionFailureReason(failedCondition, context)
          : 'Unknown condition failure';
        
        blockedPayments.push({ method, reason });
      }
    });

    setTestResults({
      availablePayments,
      blockedPayments,
      flowActive,
      flowBlockReason
    });
  };

  const evaluateCondition = (condition: CheckoutCondition, context: CheckoutContext): boolean => {
    const type = condition.condition_type || condition.type;
    
    switch (type) {
      case 'min_total':
        return context.total >= (condition.value?.amount || condition.amount || 0);
      case 'max_total':
        return context.total <= (condition.value?.amount || condition.amount || Number.POSITIVE_INFINITY);
      case 'state_is':
        return (context.destinationState || '').toLowerCase() === (condition.value?.state || condition.state || '').toLowerCase();
      case 'state_is_not':
        return (context.destinationState || '').toLowerCase() !== (condition.value?.state || condition.state || '').toLowerCase();
      case 'user_logged_in':
        return (condition.value?.required !== false) ? !context.isGuest : context.isGuest;
      case 'tn_shipping_restricted':
        const hasRestricted = context.items.some(item => item.tn_shipping_enabled === false);
        return condition.value === false ? !hasRestricted : hasRestricted;
      default:
        return true;
    }
  };

  const getConditionFailureReason = (condition: CheckoutCondition, context: CheckoutContext): string => {
    const type = condition.condition_type || condition.type;
    
    switch (type) {
      case 'min_total':
        return `Order total ₹${context.total} is below minimum ₹${condition.value?.amount || condition.amount}`;
      case 'max_total':
        return `Order total ₹${context.total} exceeds maximum ₹${condition.value?.amount || condition.amount}`;
      case 'state_is':
        return `Delivery state "${context.destinationState}" does not match required "${condition.value?.state || condition.state}"`;
      case 'state_is_not':
        return `Delivery to "${context.destinationState}" is not allowed`;
      case 'user_logged_in':
        return condition.value?.required !== false ? 'User must be logged in' : 'Guest checkout not allowed';
      case 'tn_shipping_restricted':
        return condition.value === false 
          ? 'Cart contains items restricted for Tamil Nadu shipping'
          : 'Cart must contain TN-restricted items';
      default:
        return 'Condition not met';
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Test Scenario Input */}
      <div className="space-y-3">
        <h4 className="font-medium">Test Scenario</h4>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Order Total (₹)</Label>
              <Input
                type="number"
                value={scenario.orderTotal}
                onChange={(e) => setScenario({ ...scenario, orderTotal: parseFloat(e.target.value) || 0 })}
                placeholder="1500"
              />
            </div>
            <div>
              <Label className="text-xs">Delivery State</Label>
              <Input
                value={scenario.deliveryState}
                onChange={(e) => setScenario({ ...scenario, deliveryState: e.target.value })}
                placeholder="Karnataka"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-2">
              <Switch
                checked={scenario.isLoggedIn}
                onCheckedChange={(checked) => setScenario({ ...scenario, isLoggedIn: checked })}
              />
              <Label className="text-xs">User Logged In</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={scenario.hasRestrictedItems}
                onCheckedChange={(checked) => setScenario({ ...scenario, hasRestrictedItems: checked })}
              />
              <Label className="text-xs">Has Restricted Items</Label>
            </div>
          </div>
          
          <div>
            <Label className="text-xs">Items in Cart</Label>
            <Input
              type="number"
              min="1"
              value={scenario.itemCount}
              onChange={(e) => setScenario({ ...scenario, itemCount: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>
        
        <Button onClick={runTest} size="sm" className="w-full">
          <CheckCircle size={16} className="mr-2" />
          Test Conditions
        </Button>
      </div>
      
      {/* Test Results */}
      <div className="space-y-3">
        <h4 className="font-medium">Results</h4>
        
        {testResults ? (
          <div className="space-y-3">
            {/* Flow Status */}
            {flowConditions.length > 0 && (
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Checkout Flow</span>
                  {testResults.flowActive ? (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle size={12} className="mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle size={12} className="mr-1" />
                      Blocked
                    </Badge>
                  )}
                </div>
                {testResults.flowBlockReason && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {testResults.flowBlockReason}
                  </p>
                )}
              </Card>
            )}
            
            {/* Available Payment Methods */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-green-700">Available Payment Methods</h5>
              {testResults.availablePayments.length > 0 ? (
                testResults.availablePayments.map(method => (
                  <div key={method.id} className="flex items-center justify-between p-2 bg-green-50 rounded text-sm">
                    <span>{method.name}</span>
                    <CheckCircle size={16} className="text-green-600" />
                  </div>
                ))
              ) : (
                <div className="p-2 bg-gray-50 rounded text-sm text-muted-foreground">
                  No payment methods available
                </div>
              )}
            </div>
            
            {/* Blocked Payment Methods */}
            {testResults.blockedPayments.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-red-700">Blocked Payment Methods</h5>
                {testResults.blockedPayments.map(({ method, reason }) => (
                  <div key={method.id} className="space-y-1">
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded text-sm">
                      <span>{method.name}</span>
                      <AlertTriangle size={16} className="text-red-600" />
                    </div>
                    <p className="text-xs text-muted-foreground px-2">
                      {reason}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Info size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Click "Test Conditions" to see results</p>
          </div>
        )}
      </div>
    </div>
  );
};
