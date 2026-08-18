package com.largata.itinerary.api;

import tools.jackson.core.JsonParser;
import tools.jackson.databind.BeanProperty;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.JavaType;
import tools.jackson.databind.ValueDeserializer;
import tools.jackson.databind.annotation.JsonDeserialize;
import tools.jackson.databind.deser.std.StdDeserializer;
import tools.jackson.databind.type.TypeFactory;


@JsonDeserialize(using = Patchable.Deserializer.class)
public final class Patchable<T> {

    private final T value;

    private Patchable(T value) {
        this.value = value;
    }


    public static <T> Patchable<T> of(T value) {
        return new Patchable<>(value);
    }


    public static <T> Patchable<T> cleared() {
        return new Patchable<>(null);
    }


    public static boolean isAbsent(Patchable<?> patch) {
        return patch == null;
    }


    public static <T> T applyTo(Patchable<T> patch, T current) {
        return patch == null ? current : patch.value;
    }


    public T value() {
        return value;
    }


    public boolean clears() {
        return value == null;
    }


    static final class Deserializer extends StdDeserializer<Patchable<?>> {

        private final JavaType valueType;

        Deserializer() {
            this(TypeFactory.unsafeSimpleType(Object.class));
        }

        private Deserializer(JavaType valueType) {
            super(Patchable.class);
            this.valueType = valueType;
        }

        @Override
        public ValueDeserializer<?> createContextual(DeserializationContext context, BeanProperty property) {
            JavaType wrapper = property == null ? context.getContextualType() : property.getType();
            JavaType contained =
                    wrapper == null || wrapper.containedTypeCount() == 0
                            ? TypeFactory.unsafeSimpleType(Object.class)
                            : wrapper.containedType(0);
            return new Deserializer(contained);
        }

        @Override
        public Patchable<?> deserialize(JsonParser parser, DeserializationContext context) {
            return Patchable.of(context.readValue(parser, valueType));
        }

        @Override
        public Patchable<?> getNullValue(DeserializationContext context) {
            return Patchable.cleared();
        }

        @Override
        public Object getAbsentValue(DeserializationContext context) {
            return null;
        }
    }
}
