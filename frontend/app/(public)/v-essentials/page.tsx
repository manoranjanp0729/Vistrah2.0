import {UiText} from "../../../components/localized-ui";
import type {Metadata} from 'next';
import {HomepageConnect} from '@/components/homepage-connect';
export const metadata:Metadata={title:'Vistrah Essentials | VISTRAH'};
export default function VistrahEssentialsPage(){
  return <div className="page">
    <div className="container">
      <h1><UiText value={"Vistrah Essentials"}/></h1>
      <p className="lead"><UiText value={"Explore VISTRAH AgriConnect and VISTRAH HealthConnect essential services."}/></p>
    </div>
    <HomepageConnect/>
  </div>;
}

