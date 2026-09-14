import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CATEGORIES,
  MONEY_CURRENCIES,
  PAYMENT_METHODS,
  SUB_PERIODS,
  type Category,
  type MoneyCurrency,
  type PaymentMethod,
  type SubPeriod,
} from "@subflow/shared";
import { ActionBar, useTelegramChrome } from "../components/ui";
import { dateInputToIso, isoDateInput } from "../money";
import { useAppStore } from "../store";
