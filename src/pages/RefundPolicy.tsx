import { PolicyLayout } from "@/components/PolicyLayout";
const RefundPolicy = () => {
  return <PolicyLayout title="Refund and Cancellation Policy">
      <div className="space-y-6 text-muted-foreground">
        <p>
          This refund and cancellation policy outlines how you can cancel or seek a refund for a product / service
          that you have purchased through the Platform. Under this policy:
        </p>

        <ol className="list-decimal list-outside ml-6 space-y-4">
          <li>
            Cancellations will only be considered if the request is made within <strong>7 days</strong> of placing the order.
          </li>

          <li>
            In case you feel that the product received is not as shown on the site or as per your expectations,
            you must bring it to the notice of our customer service within <strong>4 days</strong> of receiving the product. The
            customer service team after looking into your complaint will take an appropriate decision.
          </li>

          <li>
            In case of complaints regarding the products that come with a warranty from the manufacturers,
            please refer the issue to them.
          </li>

          <li>
            In case of any refunds approved by NythicAI, it will take <strong>4 days</strong> for the refund to be processed to
            you, the amount will be credited to your original payment mode.
          </li>
        </ol>

        {/* Contact for Refunds */}
        <section className="bg-muted/50 p-6 rounded-lg mt-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Contact for Refund Requests</h2>
          <div className="space-y-2">
            <p>For any refund or cancellation requests, please contact our customer service:</p>
            <p><strong>Phone:</strong> +91 82773 23208</p>
            <p><strong>Time:</strong> Monday - Friday (9:00 - 18:00)</p>
            <p><strong>Address:</strong> 17-18 2nd floor Maruti Complex Line bazar Dharwad 580001</p>
          </div>
        </section>
      </div>
    </PolicyLayout>;
};
export default RefundPolicy;