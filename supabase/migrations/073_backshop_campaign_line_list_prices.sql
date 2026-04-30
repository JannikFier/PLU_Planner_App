-- Listen-EK / Listen-VK aus Zentral-Excel (optional), zusätzlich zu Akt.-VK und Erwerb

ALTER TABLE public.backshop_offer_campaign_lines
  ADD COLUMN IF NOT EXISTS list_ek NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS list_vk NUMERIC(12, 4);

COMMENT ON COLUMN public.backshop_offer_campaign_lines.list_ek IS
  'Listen-/Normal-EK aus Excel (optional), z. B. Spalte „Listen-EK“.';
COMMENT ON COLUMN public.backshop_offer_campaign_lines.list_vk IS
  'Listen-/Normal-VK aus Excel (optional), z. B. Spalte „Listen-VK“ oder „VK“ ohne „Akt.“.';
