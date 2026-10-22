import {UiElement} from "../../components/localized-ui";
import {Page} from '../../components/ui';
import {CustomerCart} from '../../components/commerce-orders';
export default function Cart(){return <UiElement as={Page} title="Your cart"><CustomerCart/></UiElement>;}
