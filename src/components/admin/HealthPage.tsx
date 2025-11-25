import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import DataService from '../../services/dataService';
import { settingsAPI } from '../../services/apiService';

interface HealthCheck {
  name: string;
  status: 'loading' | 'ok' | 'error';
  error?: string;
  latency?: number;
  sample?: any;
}

export function HealthPage() {
  const [checks, setChecks] = useState<HealthCheck[]>([
    { name: 'Payments (DataService)', status: 'loading' },
    { name: 'Admin Dashboard (DataService)', status: 'loading' },
    { name: 'Accountant Dashboard (DataService)', status: 'loading' },
    { name: 'System Info (DataService)', status: 'loading' },
    { name: 'Branding (settingsAPI)', status: 'loading' },
    { name: 'Subjects with Classes (DataService)', status: 'loading' },
  ]);

  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const runHealthCheck = async () => {
    setIsRunning(true);
    setLastRun(new Date());

    const next = [...checks];
    const run = async (index: number, fn: () => Promise<any>) => {
      const start = Date.now();
      try {
        const result = await fn();
        const latency = Date.now() - start;
        next[index] = { ...next[index], status: 'ok', latency, sample: result };
      } catch (error) {
        next[index] = { ...next[index], status: 'error', error: error instanceof Error ? error.message : String(error), latency: Date.now() - start };
      }
    };

    await Promise.all([
      run(0, () => DataService.getPayments()),
      run(1, () => DataService.getDashboardData()),
      run(2, () => DataService.getAccountantDashboardData()),
      run(3, () => DataService.getSystemInfo()),
      run(4, () => settingsAPI.getSchoolBranding()),
      run(5, () => DataService.getSubjectsWithClasses()),
    ]);

    setChecks(next);
    setIsRunning(false);
    const okCount = next.filter(c => c.status === 'ok').length;
    toast.success(`Health check complete: ${okCount}/${next.length} services OK`);
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const statusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'ok': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'loading': return <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />;
    }
  };

  const statusBadge = (status: HealthCheck['status']) => {
    const variant = status === 'ok' ? 'default' : status === 'error' ? 'destructive' : 'secondary';
    const text = status === 'ok' ? 'OK' : status === 'error' ? 'ERROR' : 'LOADING';
    return <Badge variant={variant}>{text}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900 mb-2">System Health</h1>
        <p className="text-gray-600">Quick verification of core DataService and API endpoints</p>
        {lastRun && <p className="text-xs text-gray-500 mt-1">Last run: {lastRun.toLocaleString()}</p>}
      </div>

      <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
        <CardHeader className="p-5 border-b border-gray-200 flex flex-row items-center justify-between">
          <h3 className="text-lg text-gray-900">Health Checks</h3>
          <Button onClick={runHealthCheck} disabled={isRunning} className="rounded-xl">
            <RefreshCw className={`w-4 h-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running...' : 'Run Checks'}
          </Button>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {checks.map((check, i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                {statusIcon(check.status)}
                <div>
                  <p className="text-sm font-medium text-gray-900">{check.name}</p>
                  {check.latency !== undefined && (
                    <p className="text-xs text-gray-500">{check.latency} ms</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(check.status)}
                {check.error && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(check.error || '');
                      toast.info('Error details copied to clipboard');
                    }}
                  >
                    Copy error
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
        <CardHeader className="p-5 border-b border-gray-200">
          <h3 className="text-lg text-gray-900">Sample Data (last check)</h3>
        </CardHeader>
        <CardContent className="p-5">
          <div className="space-y-4">
            {checks.map((check, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-gray-700 mb-1">{check.name}</p>
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-32">
                  {check.status === 'ok' ? JSON.stringify(check.sample, null, 2) : 'N/A'}
                </pre>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
