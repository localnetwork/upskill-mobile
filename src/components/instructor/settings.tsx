import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  Chips,
  Columns,
  Empty,
  fmtDate,
  InfoRow,
  num,
  OutlineButton,
  php,
  PrimaryButton,
  SectionTitle,
  Sheet,
  StatGrid,
  SubTabs,
} from '@/components/dark-ui';
import {
  fetchPayoutHistory,
  fetchPayoutSummary,
  getPayoutVerificationMethod,
  requestPayout,
  savePayoutAccount,
  verifyPayoutAccountCode,
} from '@/lib/upskill-api';

const SECTIONS = [
  { key: 'settings', label: 'Payout settings' },
  { key: 'account', label: 'Payout account' },
  { key: 'history', label: 'Payout history' },
] as const;
type Section = (typeof SECTIONS)[number]['key'];

const RANGES = [
  { key: '3m', label: 'Last 3 months' },
  { key: '6m', label: 'Last 6 months' },
  { key: 'year', label: 'Yearly' },
  { key: '5y', label: '5 years' },
  { key: 'custom', label: 'Custom range' },
] as const;
type Range = (typeof RANGES)[number]['key'];

const CHANNELS = [
  { code: 'PH_GCASH', label: 'GCash' },
  { code: 'PH_PAYMAYA', label: 'Maya' },
  { code: 'PH_BDO', label: 'BDO Unibank' },
  { code: 'PH_BPI', label: 'BPI' },
  { code: 'PH_UNIONBANK', label: 'UnionBank' },
  { code: 'PH_METROBANK', label: 'Metrobank' },
];

const INPUT = 'rounded-md border border-[#6A6F73] bg-black px-4 py-3 text-[16px] text-white';
const mask = (v: unknown) => {
  const t = String(v || '');
  return t.length > 4 ? `${'•'.repeat(t.length - 4)}${t.slice(-4)}` : t;
};
const channelLabel = (code?: string) => CHANNELS.find((c) => c.code === code)?.label || code || '-';
const STATUS_COLOR: Record<string, string> = {
  EXECUTED: '#22C55E',
  APPROVED: '#3B82F6',
  REQUESTED: '#F59E0B',
  FAILED: '#F97316',
  REJECTED: '#EF4444',
};
const statusLabel = (s?: string) => {
  const key = String(s || '').toUpperCase();
  return key === 'EXECUTED' ? 'Paid' : key.charAt(0) + key.slice(1).toLowerCase();
};

function parseDate(value: string, endOfDay = false) {
  const d = new Date(`${value}${endOfDay ? 'T23:59:59' : 'T00:00:00'}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function InstructorSettings() {
  const [section, setSection] = useState<Section>('settings');
  const [summary, setSummary] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [range, setRange] = useState<Range>('6m');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [active, setActive] = useState<any>(null);

  const [accountOpen, setAccountOpen] = useState<null | 'code' | 'form'>(null);
  const [method, setMethod] = useState('none');
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState<Record<string, string>>({});
  const [channel, setChannel] = useState('PH_GCASH');
  const [holder, setHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [s, p] = await Promise.all([fetchPayoutSummary(), fetchPayoutHistory()]);
      setSummary(s);
      setPayouts(p);
    } catch (e: any) {
      setError(e?.message || 'Unable to load payout data');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const account = summary?.payoutAccount;
  const hasAccount = !!account?.accountNumber;
  const cycle = String(summary?.payoutCycle || 'ANYTIME').toUpperCase();
  const totalPaidOut = payouts
    .filter((p) => String(p.status).toUpperCase() === 'EXECUTED')
    .reduce((t, p) => t + num(p.amount), 0);

  const events = useMemo(
    () =>
      payouts.flatMap((row) =>
        (Array.isArray(row?.items) ? row.items : []).flatMap((item: any) => {
          const date = new Date(
            item?.orderItem?.order?.createdAt || item?.orderItem?.createdAt || row?.requestedAt || row?.createdAt,
          );
          const amount = num(item?.amount ?? item?.orderItem?.educatorEarning);
          return Number.isNaN(date.getTime()) || amount <= 0 ? [] : [{ date, amount }];
        }),
      ),
    [payouts],
  );

  const chart = useMemo(() => {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    let end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    let yearly = false;
    if (range === '3m') start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    if (range === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    }
    if (range === '5y') {
      start = new Date(now.getFullYear() - 4, 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      yearly = true;
    }
    if (range === 'custom') {
      const s = parseDate(customStart);
      const e = parseDate(customEnd, true);
      if (!s || !e || s > e) return [];
      start = new Date(s.getFullYear(), s.getMonth(), 1);
      end = e;
    }

    const buckets = new Map<string, { label: string; value: number }>();
    const key = (d: Date) => (yearly ? `${d.getFullYear()}` : `${d.getFullYear()}-${d.getMonth()}`);
    const cursor = new Date(start);
    while (cursor <= end && buckets.size < 120) {
      buckets.set(key(cursor), {
        label: yearly
          ? String(cursor.getFullYear())
          : cursor.toLocaleDateString('en-PH', { month: 'short', year: range === 'custom' ? '2-digit' : undefined }),
        value: 0,
      });
      if (yearly) cursor.setFullYear(cursor.getFullYear() + 1);
      else cursor.setMonth(cursor.getMonth() + 1);
    }
    events.forEach((e) => {
      if (e.date < start || e.date > end) return;
      const bucket = buckets.get(key(e.date));
      if (bucket) bucket.value += e.amount;
    });
    return Array.from(buckets.values());
  }, [events, range, customStart, customEnd]);

  const startAccountUpdate = async () => {
    setFormError('');
    setBusy(true);
    try {
      const m = hasAccount ? await getPayoutVerificationMethod() : 'none';
      setMethod(m);
      setAccountOpen(m === 'none' ? 'form' : 'code');
    } catch (e: any) {
      setNotice(e?.message || 'Unable to start verification.');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setFormError('');
    setBusy(true);
    try {
      await verifyPayoutAccountCode(code.trim());
      setVerified({ code: code.trim() });
      setCode('');
      setAccountOpen('form');
    } catch (e: any) {
      setFormError(e?.message || 'Invalid code.');
    } finally {
      setBusy(false);
    }
  };

  const saveAccount = async () => {
    setFormError('');
    if (!holder.trim() || !accountNumber.trim()) {
      setFormError('Enter the account holder name and number.');
      return;
    }
    setBusy(true);
    try {
      await savePayoutAccount({
        channelCode: channel,
        accountHolderName: holder.trim(),
        accountNumber: accountNumber.replace(/\s+/g, ''),
        ...(hasAccount ? verified : {}),
      });
      setAccountOpen(null);
      setHolder('');
      setAccountNumber('');
      setVerified({});
      setNotice('Payout account saved.');
      await load();
    } catch (e: any) {
      setFormError(e?.message || 'Failed to save payout account.');
    } finally {
      setBusy(false);
    }
  };

  const submitPayout = async () => {
    setBusy(true);
    setNotice('');
    try {
      await requestPayout(`Instructor ${cycle.toLowerCase()} payout request`);
      setNotice('Payout submitted.');
      await load();
    } catch (e: any) {
      setNotice(e?.message || 'Failed to request payout.');
    } finally {
      setBusy(false);
    }
  };

  const transactions = (row: any) =>
    (Array.isArray(row?.items) ? row.items : []).map((item: any, i: number) => {
      const oi = item?.orderItem || {};
      const learner = oi?.order?.user || {};
      return {
        id: item?.id || `${row.id}-${i}`,
        learner: learner.fullName?.trim() || learner.username || 'Unknown learner',
        course: oi?.course?.title || 'Unknown course',
        date: oi?.order?.createdAt || oi?.createdAt,
        amount: num(item?.amount ?? oi?.educatorEarning),
      };
    });

  return (
    <View>
      <View className="-mx-4 mb-4">
        <SubTabs tabs={SECTIONS} value={section} onChange={setSection} />
      </View>
      {error ? <Text className="mb-3 text-danger">{error}</Text> : null}
      {notice ? <Text className="mb-3 text-[#C0C4FC]">{notice}</Text> : null}
      {loading ? <Text className="text-[#D1D7DC]">Loading...</Text> : null}

      {!loading && section === 'settings' ? (
        <>
          <StatGrid
            items={[
              { label: 'Subscription earnings', value: php(summary?.subscriptionEarningsBalance) },
              { label: 'Available payout', value: php(summary?.availableBalance), hint: `Minimum ${php(summary?.minimumPayoutAmount || 500, 0)}` },
              { label: 'Recent income', value: php(summary?.thisMonthEarnings), hint: `Cycle: ${cycle.toLowerCase()}` },
              {
                label: 'Est. next payout',
                value: php(summary?.availableBalance),
                hint: summary?.nextPayoutDate ? `Next cycle ${fmtDate(summary.nextPayoutDate)}` : 'Anytime',
              },
              { label: 'Total paid out', value: php(totalPaidOut) },
              { label: 'Course sales', value: php(summary?.salesBalance) },
            ]}
          />

          <View className="mt-5">
            <PrimaryButton
              label={busy ? 'Working...' : 'Request payout'}
              onPress={submitPayout}
              disabled={busy || !summary?.canRequestPayout}
            />
            {!summary?.canRequestPayout && summary?.cannotRequestReason ? (
              <Text className="mt-2 text-[14px] text-[#D1D7DC]">{summary.cannotRequestReason}</Text>
            ) : null}
          </View>

          <SectionTitle>Earnings</SectionTitle>
          <Chips options={RANGES} value={range} onChange={setRange} />
          {range === 'custom' ? (
            <View className="mb-3 flex-row gap-3">
              <TextInput
                value={customStart}
                onChangeText={setCustomStart}
                placeholder="From YYYY-MM-DD"
                placeholderTextColor="#6A6F73"
                className={`${INPUT} flex-1`}
              />
              <TextInput
                value={customEnd}
                onChangeText={setCustomEnd}
                placeholder="To YYYY-MM-DD"
                placeholderTextColor="#6A6F73"
                className={`${INPUT} flex-1`}
              />
            </View>
          ) : null}
          <Columns data={chart} format={(v) => php(v, 0)} />
        </>
      ) : null}

      {!loading && section === 'account' ? (
        <>
          <Text className="text-[16px] text-[#D1D7DC]">
            Payouts are sent to your GCash, Maya, or bank account.
          </Text>
          <View className="my-4">
            {hasAccount ? (
              <>
                <InfoRow label="Channel" value={channelLabel(account.channelCode)} />
                <InfoRow label="Account holder" value={String(account.accountHolderName || '-')} />
                <InfoRow label="Account number" value={mask(account.accountNumber)} />
              </>
            ) : (
              <Empty>No payout account linked yet.</Empty>
            )}
          </View>
          <PrimaryButton
            label={hasAccount ? 'Update payout account' : 'Link payout account'}
            onPress={startAccountUpdate}
            disabled={busy}
          />
        </>
      ) : null}

      {!loading && section === 'history' ? (
        payouts.length ? (
          payouts.map((row) => {
            const status = String(row.status || '').toUpperCase();
            return (
              <View key={row.id} className="mb-5 border-b border-[#2D2F31] pb-5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[20px] font-bold text-white">{php(row.amount)}</Text>
                  <Text style={{ color: STATUS_COLOR[status] || '#D1D7DC' }} className="text-[14px] font-bold">
                    {statusLabel(row.status)}
                  </Text>
                </View>
                <Text className="mt-1 text-[14px] text-[#D1D7DC]">
                  Requested {fmtDate(row.requestedAt || row.createdAt)} · Paid {fmtDate(row.executedAt)}
                </Text>
                <Pressable onPress={() => setActive(row)} className="mt-3 self-start">
                  <Text className="text-[16px] font-bold text-[#C0C4FC]">View details</Text>
                </Pressable>
              </View>
            );
          })
        ) : (
          <Empty>No payout requests yet.</Empty>
        )
      ) : null}

      <Sheet visible={!!active} title="Payout info" onClose={() => setActive(null)}>
        {active ? (
          <>
            <InfoRow label="Payout ID" value={String(active.id)} />
            <InfoRow label="Amount" value={php(active.amount)} />
            <InfoRow label="Status" value={statusLabel(active.status)} />
            <InfoRow label="Requested" value={fmtDate(active.requestedAt || active.createdAt)} />
            <InfoRow label="Paid" value={fmtDate(active.executedAt)} />
            <SectionTitle>Transactions</SectionTitle>
            {transactions(active).length ? (
              transactions(active).map((t: any) => (
                <View key={t.id} className="mb-4 border-b border-[#2D2F31] pb-4">
                  <Text className="text-[16px] font-bold text-white">{t.course}</Text>
                  <Text className="mt-1 text-[14px] text-[#D1D7DC]">
                    {t.learner} · {fmtDate(t.date)}
                  </Text>
                  <Text className="mt-1 text-[15px] font-bold text-white">{php(t.amount)}</Text>
                </View>
              ))
            ) : (
              <Empty>No transaction details.</Empty>
            )}
          </>
        ) : null}
      </Sheet>

      <Sheet
        visible={accountOpen !== null}
        title={accountOpen === 'code' ? 'Verify your identity' : 'Payout account'}
        onClose={() => !busy && setAccountOpen(null)}>
        {accountOpen === 'code' ? (
          <>
            <Text className="mb-2 text-[#D1D7DC]">
              {method === 'totp' ? 'Enter your authenticator code.' : 'Enter the verification code.'}
            </Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              placeholder="123456"
              placeholderTextColor="#6A6F73"
              className={INPUT}
            />
            {formError ? <Text className="mt-3 text-danger">{formError}</Text> : null}
            <View className="mt-5">
              <PrimaryButton label={busy ? 'Verifying...' : 'Verify'} onPress={verifyCode} disabled={busy || !code.trim()} />
            </View>
          </>
        ) : null}
        {accountOpen === 'form' ? (
          <>
            <Text className="mb-1 text-[#D1D7DC]">Channel</Text>
            <Chips options={CHANNELS.map((c) => ({ key: c.code, label: c.label }))} value={channel} onChange={setChannel} />
            <Text className="mb-2 mt-2 text-[#D1D7DC]">Account holder name</Text>
            <TextInput value={holder} onChangeText={setHolder} placeholderTextColor="#6A6F73" className={INPUT} />
            <Text className="mb-2 mt-4 text-[#D1D7DC]">Account number</Text>
            <TextInput
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
              placeholderTextColor="#6A6F73"
              className={INPUT}
            />
            {formError ? <Text className="mt-3 text-danger">{formError}</Text> : null}
            <View className="mt-5 gap-3">
              <PrimaryButton label={busy ? 'Saving...' : 'Save account'} onPress={saveAccount} disabled={busy} />
              <OutlineButton label="Cancel" onPress={() => setAccountOpen(null)} />
            </View>
          </>
        ) : null}
      </Sheet>
    </View>
  );
}
