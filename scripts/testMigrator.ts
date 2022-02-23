import hre from "hardhat";
import {LendingMigrator__factory} from "../src/types/factories/LendingMigrator__factory";
import {IERC20__factory} from "../src/types/factories/IERC20__factory";
import { constants, utils } from "ethers";


const EULER = "0x27182842E098f60e3D576794A5bFFb0777E025d3";
const EULER_MARKETS = "0x3520d5a913427E6F0D6A83E07ccD4A4da316e4d3";
const AAVEV2_LENDINGPOOL = "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9";
const EUSDC = "0xeb91861f8a4e1c12333f42dce8fb0ecdc28da716";
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const AUSDC = "0xbcca60bb61934080951369a648fb03df4f96263c";

async function main() {
    const account = "0x1e17A75616cd74f5846B1b71622Aa8e10ea26Cc0";
    const { ethers } = hre;

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [account],
    });

    const signer = await ethers.getSigner(account);

    const lendingMigratorFactory = new LendingMigrator__factory(signer);

    const eUSDC = IERC20__factory.connect(EUSDC, signer);
    const aUSDC = IERC20__factory.connect(AUSDC, signer);

    console.log("deploying lending migrator");
    const lendingMigrator = await lendingMigratorFactory.deploy(
      EULER,
      EULER_MARKETS,
      AAVEV2_LENDINGPOOL,
      0
    );
    
    console.log("doing approval");
    // approval
    await eUSDC.approve(lendingMigrator.address, constants.MaxUint256);

    const calldatas: any[] = [];

    calldatas.push(
      (await lendingMigrator.populateTransaction.pullToken(eUSDC.address, constants.MaxUint256)).data
    );

    calldatas.push(
      (await lendingMigrator.populateTransaction.withdrawEuler(eUSDC.address, constants.AddressZero)).data
    );

    calldatas.push(
      (await lendingMigrator.populateTransaction.depositAaveV2(USDC, signer.address)).data
    );

    console.log(signer.address);
    console.log("migrating eUSDC -> aUSDC")
    await lendingMigrator.batch(calldatas, true);
    const usdcAmountAfter = await aUSDC.balanceOf(signer.address);
    const contractUSDCAmountAfter = await aUSDC.balanceOf(lendingMigrator.address);
    console.log("aUSDC balance", utils.formatUnits(usdcAmountAfter, 6));
    console.log("aUSDC contract balance", utils.formatUnits(contractUSDCAmountAfter, 6));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });