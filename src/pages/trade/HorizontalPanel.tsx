import { useCallback, useMemo, useState } from 'react';

import { shallowEqual } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { STRING_KEYS } from '@/constants/localization';
import { AppRoute } from '@/constants/routes';

import { useBreakpoints } from '@/hooks/useBreakpoints';
import { useParameterizedSelector } from '@/hooks/useParameterizedSelector';
import { useShouldShowTriggers } from '@/hooks/useShouldShowTriggers';
import { useStringGetter } from '@/hooks/useStringGetter';

import { formMixins } from '@/styles/formMixins';

import { AssetIcon } from '@/components/AssetIcon';
import { CollapsibleTabs } from '@/components/CollapsibleTabs';
import { LoadingSpinner } from '@/components/Loading/LoadingSpinner';
import { SelectItem, SelectMenu } from '@/components/SelectMenu';
import { VerticalSeparator } from '@/components/Separator';
import { MobileTabs } from '@/components/Tabs';
import { Tag, TagType } from '@/components/Tag';
import { ToggleGroup } from '@/components/ToggleGroup';
import { PositionInfo } from '@/views/PositionInfo';
import { FillsTable, FillsTableColumnKey } from '@/views/tables/FillsTable';
import { OrdersTable, OrdersTableColumnKey } from '@/views/tables/OrdersTable';
import { PositionsTable, PositionsTableColumnKey } from '@/views/tables/PositionsTable';

import {
  calculateIsAccountViewOnly,
  calculateShouldRenderActionsInPositionsTable,
} from '@/state/accountCalculators';
import {
  getCurrentMarketTradeInfoNumbers,
  getHasUnseenFillUpdates,
  getHasUnseenOrderUpdates,
  getTradeInfoNumbers,
} from '@/state/accountSelectors';
import { useAppSelector } from '@/state/appTypes';
import { getDefaultToAllMarketsInPositionsOrdersFills } from '@/state/appUiConfigsSelectors';
import { getAssetImageUrl } from '@/state/assetsSelectors';
import { getHasUncommittedOrders } from '@/state/localOrdersSelectors';
import { getCurrentMarketAssetId, getCurrentMarketId } from '@/state/perpetualsSelectors';

import { getDisplayableAssetFromBaseAsset } from '@/lib/assetUtils';
import { isTruthy } from '@/lib/isTruthy';
import { shortenNumberForDisplay } from '@/lib/numbers';
import { testFlags } from '@/lib/testFlags';

import { TradeTableSettings } from './TradeTableSettings';
import { MaybeUnopenedIsolatedPositionsDrawer } from './UnopenedIsolatedPositions';
import { MarketTypeFilter, PanelView } from './types';

enum InfoSection {
  Position = 'Position',
  Orders = 'Orders',
  Fills = 'Fills',
  Payments = 'Payments',
}

type ElementProps = {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
};

export const HorizontalPanel = ({ isOpen = true, setIsOpen }: ElementProps) => {
  const stringGetter = useStringGetter();
  const navigate = useNavigate();
  const { isTablet, isDesktopSmall } = useBreakpoints();

  const { uiRefresh } = testFlags;

  const allMarkets = useAppSelector(getDefaultToAllMarketsInPositionsOrdersFills);
  const [view, setView] = useState<PanelView>(
    allMarkets ? PanelView.AllMarkets : PanelView.CurrentMarket
  );
  const [viewIsolated, setViewIsolated] = useState<MarketTypeFilter>(MarketTypeFilter.AllMarkets);
  const [tab, setTab] = useState<InfoSection>(InfoSection.Position);

  const currentMarketId = useAppSelector(getCurrentMarketId);
  const currentMarketAssetId = useAppSelector(getCurrentMarketAssetId);
  const currentMarketAssetImgUrl = useAppSelector((s) => getAssetImageUrl(s, currentMarketAssetId));

  const { numTotalPositions, numTotalOpenOrders, numTotalUnseenFills } =
    useAppSelector(getTradeInfoNumbers, shallowEqual) ?? {};

  const { numOpenOrders, numUnseenFills } =
    useAppSelector(getCurrentMarketTradeInfoNumbers, shallowEqual) ?? {};

  const hasUnseenOrderUpdates = useAppSelector(getHasUnseenOrderUpdates);
  const hasUnseenFillUpdates = useAppSelector(getHasUnseenFillUpdates);
  const isAccountViewOnly = useAppSelector(calculateIsAccountViewOnly);
  const shouldRenderTriggers = useShouldShowTriggers();
  const shouldRenderActions = useParameterizedSelector(
    calculateShouldRenderActionsInPositionsTable
  );
  const isWaitingForOrderToIndex = useAppSelector(getHasUncommittedOrders);
  const showCurrentMarket = isTablet || view === PanelView.CurrentMarket;

  const fillsTagNumber = shortenNumberForDisplay(
    showCurrentMarket ? numUnseenFills : numTotalUnseenFills
  );
  const ordersTagNumber = shortenNumberForDisplay(
    showCurrentMarket ? numOpenOrders : numTotalOpenOrders
  );

  const initialPageSize = 10;

  const onViewOrders = useCallback(
    (market: string) => {
      navigate(`${AppRoute.Trade}/${market}`, {
        state: {
          from: AppRoute.Trade,
        },
      });
      setView(PanelView.CurrentMarket);
      setTab(InfoSection.Orders);
    },
    [navigate]
  );

  const positionTabItem = useMemo(
    () => ({
      value: InfoSection.Position,
      label: stringGetter({
        key: showCurrentMarket ? STRING_KEYS.POSITION : STRING_KEYS.POSITIONS,
      }),

      tag: showCurrentMarket ? null : shortenNumberForDisplay(numTotalPositions),

      content: isTablet ? (
        <PositionInfo showNarrowVariation={isTablet} />
      ) : (
        <PositionsTable
          currentMarket={showCurrentMarket ? currentMarketId : undefined}
          marketTypeFilter={viewIsolated}
          columnKeys={
            uiRefresh
              ? [
                  PositionsTableColumnKey.Market,
                  PositionsTableColumnKey.Leverage,
                  PositionsTableColumnKey.Type,
                  PositionsTableColumnKey.Size,
                  PositionsTableColumnKey.Value,
                  PositionsTableColumnKey.PnL,
                  PositionsTableColumnKey.Margin,
                  PositionsTableColumnKey.AverageOpen,
                  PositionsTableColumnKey.Oracle,
                  PositionsTableColumnKey.Liquidation,
                  PositionsTableColumnKey.NetFunding,
                  shouldRenderTriggers && PositionsTableColumnKey.Triggers,
                  shouldRenderActions && PositionsTableColumnKey.Actions,
                ].filter(isTruthy)
              : [
                  PositionsTableColumnKey.Market,
                  PositionsTableColumnKey.Size,
                  PositionsTableColumnKey.Margin,
                  PositionsTableColumnKey.UnrealizedPnl,
                  !isDesktopSmall && PositionsTableColumnKey.RealizedPnl,
                  PositionsTableColumnKey.NetFunding,
                  PositionsTableColumnKey.AverageOpenAndClose,
                  PositionsTableColumnKey.LiquidationAndOraclePrice,
                  shouldRenderTriggers && PositionsTableColumnKey.Triggers,
                  shouldRenderActions && PositionsTableColumnKey.Actions,
                ].filter(isTruthy)
          }
          columnWidths={
            uiRefresh
              ? {
                  [PositionsTableColumnKey.Actions]: 80,
                }
              : undefined
          }
          showClosePositionAction={shouldRenderActions}
          initialPageSize={initialPageSize}
          navigateToOrders={onViewOrders}
        />
      ),
    }),
    [
      stringGetter,
      currentMarketId,
      viewIsolated,
      showCurrentMarket,
      isTablet,
      isDesktopSmall,
      shouldRenderActions,
      shouldRenderTriggers,
      numTotalPositions,
      onViewOrders,
      uiRefresh,
    ]
  );

  const ordersTabItem = useMemo(
    () => ({
      asChild: true,
      value: InfoSection.Orders,
      label: stringGetter({ key: STRING_KEYS.ORDERS }),

      slotRight: isWaitingForOrderToIndex ? (
        <LoadingSpinner tw="[--spinner-width:1rem]" />
      ) : (
        ordersTagNumber && (
          <Tag type={TagType.Number} isHighlighted={hasUnseenOrderUpdates}>
            {ordersTagNumber}
          </Tag>
        )
      ),

      content: (
        <OrdersTable
          currentMarket={showCurrentMarket ? currentMarketId : undefined}
          marketTypeFilter={viewIsolated}
          columnKeys={
            isTablet
              ? [OrdersTableColumnKey.StatusFill, OrdersTableColumnKey.PriceType]
              : uiRefresh
                ? [
                    !showCurrentMarket && OrdersTableColumnKey.Market,
                    OrdersTableColumnKey.Status,
                    OrdersTableColumnKey.Side,
                    OrdersTableColumnKey.Amount,
                    OrdersTableColumnKey.Filled,
                    OrdersTableColumnKey.OrderValue,
                    OrdersTableColumnKey.Price,
                    OrdersTableColumnKey.Trigger,
                    OrdersTableColumnKey.MarginType,
                    OrdersTableColumnKey.GoodTil,
                    !isAccountViewOnly && OrdersTableColumnKey.Actions,
                  ].filter(isTruthy)
                : [
                    !showCurrentMarket && OrdersTableColumnKey.Market,
                    OrdersTableColumnKey.Status,
                    OrdersTableColumnKey.Side,
                    OrdersTableColumnKey.AmountFill,
                    OrdersTableColumnKey.Price,
                    OrdersTableColumnKey.Trigger,
                    OrdersTableColumnKey.MarginType,
                    OrdersTableColumnKey.GoodTil,
                    !isAccountViewOnly && OrdersTableColumnKey.Actions,
                  ].filter(isTruthy)
          }
          initialPageSize={initialPageSize}
        />
      ),
    }),
    [
      stringGetter,
      currentMarketId,
      viewIsolated,
      showCurrentMarket,
      isTablet,
      isWaitingForOrderToIndex,
      isAccountViewOnly,
      ordersTagNumber,
      hasUnseenOrderUpdates,
      uiRefresh,
    ]
  );

  const fillsTabItem = useMemo(
    () => ({
      asChild: true,
      value: InfoSection.Fills,
      label: stringGetter({ key: STRING_KEYS.FILLS }),

      slotRight: fillsTagNumber && (
        <Tag type={TagType.Number} isHighlighted={hasUnseenFillUpdates}>
          {fillsTagNumber}
        </Tag>
      ),

      content: (
        <FillsTable
          currentMarket={showCurrentMarket ? currentMarketId : undefined}
          columnKeys={
            isTablet
              ? [
                  FillsTableColumnKey.Time,
                  FillsTableColumnKey.TypeAmount,
                  FillsTableColumnKey.PriceFee,
                ]
              : uiRefresh
                ? [
                    !showCurrentMarket && FillsTableColumnKey.Market,
                    FillsTableColumnKey.Time,
                    FillsTableColumnKey.Type,
                    FillsTableColumnKey.Side,
                    FillsTableColumnKey.AmountTag,
                    FillsTableColumnKey.Price,
                    FillsTableColumnKey.Total,
                    FillsTableColumnKey.Fee,
                    FillsTableColumnKey.Liquidity,
                  ].filter(isTruthy)
                : [
                    !showCurrentMarket && FillsTableColumnKey.Market,
                    FillsTableColumnKey.Time,
                    FillsTableColumnKey.Type,
                    FillsTableColumnKey.Side,
                    FillsTableColumnKey.AmountTag,
                    FillsTableColumnKey.Price,
                    FillsTableColumnKey.TotalFee,
                    FillsTableColumnKey.Liquidity,
                  ].filter(isTruthy)
          }
          columnWidths={{
            [FillsTableColumnKey.TypeAmount]: '100%',
          }}
          initialPageSize={initialPageSize}
        />
      ),
    }),
    [
      stringGetter,
      currentMarketId,
      showCurrentMarket,
      isTablet,
      fillsTagNumber,
      hasUnseenFillUpdates,
      uiRefresh,
    ]
  );

  // TODO - TRCL-1693 - re-enable when funding payments are supported
  // const paymentsTabItem = {
  //   value: InfoSection.Payments,
  //   label: stringGetter({ key: STRING_KEYS.PAYMENTS }),

  //   tag: shortenNumberForDisplay(
  //     showCurrentMarket ? numFundingPayments : numTotalFundingPayments
  //   ),
  //   content: (
  //     <FundingPaymentsTable currentMarket={showCurrentMarket ? currentMarket?.id : undefined} />
  //   ),
  // },

  const tabItems = useMemo(
    () =>
      uiRefresh
        ? [positionTabItem, fillsTabItem, ordersTabItem]
        : [positionTabItem, ordersTabItem, fillsTabItem],
    [uiRefresh, positionTabItem, fillsTabItem, ordersTabItem]
  );

  const slotBottom = {
    [InfoSection.Position]: (
      <MaybeUnopenedIsolatedPositionsDrawer onViewOrders={onViewOrders} tw="mt-auto" />
    ),
    [InfoSection.Orders]: null,
    [InfoSection.Fills]: null,
    [InfoSection.Payments]: null,
  }[tab];

  return isTablet ? (
    <MobileTabs defaultValue={InfoSection.Position} items={tabItems} />
  ) : (
    <>
      <CollapsibleTabs
        defaultTab={InfoSection.Position}
        tab={tab}
        setTab={setTab}
        defaultOpen={isOpen}
        onOpenChange={setIsOpen}
        dividerStyle={uiRefresh ? 'underline' : 'border'}
        slotToolbar={
          uiRefresh ? (
            <TradeTableSettings
              panelView={view}
              marketTypeFilter={viewIsolated}
              setPanelView={setView}
              setMarketTypeFilter={setViewIsolated}
              onOpenChange={setIsOpen}
            />
          ) : (
            <>
              <ToggleGroup
                items={[
                  {
                    value: PanelView.AllMarkets,
                    label: stringGetter({ key: STRING_KEYS.ALL }),
                  },
                  {
                    value: PanelView.CurrentMarket,
                    ...(currentMarketAssetId
                      ? {
                          slotBefore: (
                            <AssetIcon
                              logoUrl={currentMarketAssetImgUrl}
                              symbol={currentMarketAssetId}
                              tw="text-[1.5em]"
                            />
                          ),
                          label: getDisplayableAssetFromBaseAsset(currentMarketAssetId),
                        }
                      : { label: stringGetter({ key: STRING_KEYS.MARKET }) }),
                  },
                ]}
                value={view}
                onValueChange={setView}
                onInteraction={() => {
                  setIsOpen?.(true);
                }}
              />
              <$VerticalSeparator />
              <$SelectMenu
                value={viewIsolated}
                onValueChange={(newViewIsolated: string) => {
                  setViewIsolated(newViewIsolated as MarketTypeFilter);
                }}
              >
                <$SelectItem
                  key={MarketTypeFilter.AllMarkets}
                  value={MarketTypeFilter.AllMarkets}
                  label={`${stringGetter({ key: STRING_KEYS.CROSS })} / ${stringGetter({
                    key: STRING_KEYS.ISOLATED,
                  })}`}
                />
                <$SelectItem
                  key={MarketTypeFilter.Isolated}
                  value={MarketTypeFilter.Isolated}
                  label={stringGetter({ key: STRING_KEYS.ISOLATED })}
                />
                <$SelectItem
                  key={MarketTypeFilter.Cross}
                  value={MarketTypeFilter.Cross}
                  label={stringGetter({ key: STRING_KEYS.CROSS })}
                />
              </$SelectMenu>
              <$VerticalSeparator />
            </>
          )
        }
        tabItems={tabItems}
      />
      {isOpen && slotBottom}
    </>
  );
};

const $VerticalSeparator = styled(VerticalSeparator)`
  && {
    height: 1em;
  }
`;

const $SelectMenu = styled(SelectMenu)`
  ${formMixins.inputInnerSelectMenu}
  --trigger-height: 1.75rem;
  --trigger-radius: 2rem;
  --trigger-backgroundColor: var(--color-layer-1);
`;

const $SelectItem = styled(SelectItem)`
  ${formMixins.inputInnerSelectMenuItem}
` as typeof SelectItem;
