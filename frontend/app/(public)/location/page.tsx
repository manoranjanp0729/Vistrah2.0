import {UiText} from "../../../components/localized-ui";
import {LocationChooser} from '@/components/customer-location';
export default function Location(){return <div className="container page replica-page"><h1><UiText value={"Find services near you"}/></h1><LocationChooser expanded/></div>;}
