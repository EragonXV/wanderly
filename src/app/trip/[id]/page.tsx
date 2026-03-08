import TripDetailsPageContent from './TripDetailsPageContent';

type Props = {
    params: Promise<{ id: string }>;
};

export default async function TripOverviewPage({ params }: Props) {
    const { id } = await params;
    return <TripDetailsPageContent id={id} initialTab="overview" />;
}
