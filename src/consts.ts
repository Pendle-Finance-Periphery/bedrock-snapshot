import { EthChainId } from '@sentio/sdk/eth';

export const CONFIG = {
  BLOCKCHAIN: EthChainId.ETHEREUM,
  SETTLE_FREQUENCY: 60 * 24,
};

export const MISC_CONSTS = {
  ONE_E18: BigInt('1000000000000000000'),
  ONE_DAY_IN_MINUTE: 60 * 24,
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  MULTICALL_BATCH: 256,
  MULTICALL: '0xca11bde05977b3631167028862be2a173976ca11',
};

export const PENDLE_POOL_ADDRESSES = {
  SY: '0xc430db19339a3051192233b4c49f9ab3dc6d16b7',
  YT: '0xdf74ba4436478969a54ecb352093312fe97ebaa5',
  LP: [
    {
      address: '0xbae2df4dfcd0c613018d6056a40077f2d1eff28a',
      deployedBlock: 19922391,
    },
  ],
  START_BLOCK: 19922391,
  TREASURY: '0x8270400d528c34e1596ef367eedec99080a1b592',
  EQB_STAKING: ['0x501cff5df8a307aca27c916d6e1720d41fdf64a5'],
  PENPIE_RECEIPT_TOKEN: ['0x660fe09c83df5810e118a469b472ea47de63e806'],
  STAKEDAO_RECEIPT_TOKEN: ["0x7d624409353e27f9b3650e73ebaea0122adb1855"],
  LIQUID_LOCKERS: [
    {
      address: '0x6e799758cee75dae3d84e09d40dc416ecf713652',
      lpToken: '0xbae2df4dfcd0c613018d6056a40077f2d1eff28a',
      receiptToken: '0x660fe09c83df5810e118a469b472ea47de63e806',
    },
    {
      address: '0x64627901dadb46ed7f275fd4fc87d086cff1e6e3',
      lpToken: '0xbae2df4dfcd0c613018d6056a40077f2d1eff28a',
      receiptToken: '0x501cff5df8a307aca27c916d6e1720d41fdf64a5',
    },
    {
      address: '0xd8fa8dc5adec503acc5e026a98f32ca5c1fa289a',
      lpToken: '0xbae2df4dfcd0c613018d6056a40077f2d1eff28a',
      receiptToken: '0x7d624409353e27f9b3650e73ebaea0122adb1855',
    }
  ],
};
