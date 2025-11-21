import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDefaultCheckoutFlow } from '@/lib/checkoutFlow';

const CheckoutFlowPage: React.FC = () => {
  const flow = getDefaultCheckoutFlow();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Checkout Flow</h1>
          <p className="text-muted-foreground max-w-2xl text-sm mt-1">
            View how your checkout is structured and which payment methods are allowed based on
            order total, destination and product rules.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Steps</CardTitle>
              <CardDescription>
                The high-level steps that every checkout goes through in order.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {flow.steps
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((step) => (
                  <div
                    key={step.id}
                    className="flex items-start justify-between rounded-md border px-3 py-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{step.order}
                        </Badge>
                        <span className="font-medium text-sm">{step.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground break-all">
                        Type: <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                          {step.type}
                        </code>
                      </p>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Rules</CardTitle>
              <CardDescription>
                When each payment method (Razorpay, Cash on Delivery, etc.) is allowed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {flow.paymentRules.map((rule) => (
                <div
                  key={rule.method}
                  className="rounded-md border px-3 py-2 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">{rule.label}</div>
                      <p className="text-xs text-muted-foreground">
                        Method key: <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                          {rule.method}
                        </code>
                      </p>
                    </div>
                    <Badge variant={rule.method === 'cod' ? 'outline' : 'default'} className="text-xs">
                      {rule.method === 'cod' ? 'Conditional' : 'Default'}
                    </Badge>
                  </div>

                  {rule.description && (
                    <p className="text-xs text-muted-foreground">
                      {rule.description}
                    </p>
                  )}

                  {rule.conditions && rule.conditions.length > 0 && (
                    <div className="mt-1 space-y-1">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Conditions
                      </p>
                      <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                        {rule.conditions.map((c, idx) => (
                          <li key={idx}>
                            <code className="text-[11px] bg-muted px-1 py-0.5 rounded mr-1">
                              {c.type}
                            </code>
                            {c.amount != null && <span>amount: ₹{c.amount}</span>}
                            {c.state && <span>state: {c.state}</span>}
                            {c.country && <span>country: {c.country}</span>}
                            {typeof c.value === 'boolean' && (
                              <span>value: {c.value ? 'true' : 'false'}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How this is used</CardTitle>
            <CardDescription>
              The storefront checkout reads these rules to decide which payment options are allowed
              for a given order.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page is currently read-only. To change the rules (for example, adjust the COD
              limit or allow COD for Tamil Nadu), we update the configuration in
              <code className="ml-1 text-xs bg-muted px-1 py-0.5 rounded">
                src/lib/checkoutFlow.ts
              </code>
              . A visual editor can be added later on top of the same config.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default CheckoutFlowPage;
