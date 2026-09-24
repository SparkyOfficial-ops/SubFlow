import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { beginCell, toNano } from "@ton/core";
import { Mark } from "../components/ui";
import { formatMoney } from "../money";
