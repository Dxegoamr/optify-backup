-- Create daily_summaries table for storing closed days
CREATE TABLE IF NOT EXISTS public.daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  summary_date DATE NOT NULL,
  total_deposits NUMERIC NOT NULL DEFAULT 0,
  total_withdraws NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  margin NUMERIC,
  transaction_count INTEGER DEFAULT 0,
  transactions_snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, summary_date)
);

ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily summaries"
ON public.daily_summaries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily summaries"
ON public.daily_summaries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily summaries"
ON public.daily_summaries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily summaries"
ON public.daily_summaries FOR DELETE
USING (auth.uid() = user_id);

-- Create accounts table for saldos
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fixed', 'percentage')),
  value NUMERIC NOT NULL,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own accounts"
ON public.accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts"
ON public.accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
ON public.accounts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
ON public.accounts FOR DELETE
USING (auth.uid() = user_id);

-- Create user_settings table for monthly goals and plan info
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  monthly_goal NUMERIC DEFAULT 0,
  current_plan TEXT DEFAULT 'free' CHECK (current_plan IN ('free', 'standard', 'medium', 'ultimate')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
ON public.user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_daily_summaries_updated_at
BEFORE UPDATE ON public.daily_summaries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();