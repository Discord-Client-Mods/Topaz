module.exports = {
  Clickable: goosemod.webpackModules.findByDisplayName('Clickable'),
  Button: goosemod.webpackModules.findByProps('DropdownSizes'),

  Card: goosemod.webpackModules.findByDisplayName('Card'),
  Spinner: goosemod.webpackModules.findByDisplayName('Spinner'),

  HeaderBar: goosemod.webpackModules.findByDisplayName('HeaderBar'),
  TabBar: goosemod.webpackModules.findByDisplayName('TabBar'),

  Tooltip: goosemod.webpackModules.findByProps('TooltipContainer'),

  FormTitle: goosemod.webpackModules.findByDisplayName('FormTitle'),
  FormNotice: goosemod.webpackModules.findByDisplayName('FormNotice'),
  Text: goosemod.webpackModules.findByDisplayName('LegacyText'),
  Flex: goosemod.webpackModules.findByDisplayName('Flex'),

  AdvancedScrollerThin: goosemod.webpackModules.findByProps('AdvancedScrollerThin'),
  AdvancedScrollerAuto: goosemod.webpackModules.findByProps('AdvancedScrollerAuto'),
  AdvancedScrollerNone: goosemod.webpackModules.findByProps('AdvancedScrollerNone'),

  AsyncComponent: powercord.__topaz.AsyncComponent
};